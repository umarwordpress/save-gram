import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * SaveGram extraction service.
 *
 * A thin wrapper around yt-dlp for hosts that cannot run a binary themselves.
 * It deliberately does no format mapping: /extract returns yt-dlp's JSON as it
 * is, and the SaveGram app maps it. That keeps one implementation of the
 * mapping rules rather than a copy that can drift.
 *
 * Endpoints:
 *   GET  /health              liveness probe
 *   POST /extract  {platform,url}           -> yt-dlp info JSON
 *   POST /stream   {platform,url,formatId}  -> the media bytes
 */

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.SAVEGRAM_EXTRACTOR_TOKEN || "";
/** Shared with the SaveGram app, so browser download links can be verified. */
const LINK_SECRET = process.env.SAVEGRAM_TOKEN_SECRET || "";
const YTDLP = process.env.YTDLP_PATH || "yt-dlp";
const EXTRACT_TIMEOUT_MS = Number(process.env.EXTRACT_TIMEOUT_MS || 45_000);
const MAX_BODY_BYTES = 8 * 1024;
const MAX_JSON_BYTES = 32 * 1024 * 1024;

/**
 * Hosts this service will extract from.
 *
 * yt-dlp supports well over a thousand sites. Without this list, anyone who
 * learned the token could use the service as a general purpose downloader.
 */
const ALLOWED_HOSTS = [
  "instagram.com",
  "instagr.am",
  "tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "facebook.com",
  "fb.watch",
  "fb.com",
  "m.facebook.com",
];

function hostAllowed(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return ALLOWED_HOSTS.some((base) => host === base || host.endsWith(`.${base}`));
}

function authorized(req) {
  if (!TOKEN) return true; // No token configured, for local development only.
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifies a download link signed by the SaveGram app.
 *
 * These links are followed by the visitor's browser, so they cannot carry the
 * service token. They carry a short lived signature instead.
 */
function verifyLinkToken(token) {
  if (!LINK_SECRET || LINK_SECRET.length < 16) return { ok: false, reason: "link secret not configured" };

  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return { ok: false, reason: "malformed token" };

  const expected = Buffer.from(createHmac("sha256", LINK_SECRET).update(encoded).digest("base64url"));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: "bad signature" };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "bad payload" };
  }

  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (!payload.url || !hostAllowed(payload.url)) return { ok: false, reason: "host not allowed" };

  return { ok: true, payload };
}

/** Builds a Content-Disposition value that is safe for any filename. */
function contentDisposition(filename) {
  const safe = String(filename || "savegram-download.mp4").replace(/[^\w.-]/g, "-").slice(0, 120);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

function cookiesFor(platform) {
  const specific = process.env[`YTDLP_COOKIES_${String(platform || "").toUpperCase()}`];
  return specific || process.env.YTDLP_COOKIES || "";
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(body);
}

function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let data = "";
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/** Maps yt-dlp's stderr onto the codes the SaveGram app understands. */
function classify(stderr) {
  const text = (stderr || "").toLowerCase();
  if (text.includes("login required") || text.includes("empty media response") || text.includes("--cookies")) {
    return { status: 403, code: "private_content", message: "This platform requires a signed in session." };
  }
  if (text.includes("private") || text.includes("not authorized") || text.includes("forbidden")) {
    return { status: 403, code: "private_content", message: "That post is not public." };
  }
  if (text.includes("unavailable") || text.includes("not available") || text.includes("removed") || text.includes("404")) {
    return { status: 404, code: "not_found", message: "Nothing was found at that link." };
  }
  if (text.includes("rate") && text.includes("limit")) {
    return { status: 429, code: "rate_limited", message: "Too many requests. Try again shortly." };
  }
  if (text.includes("unsupported url")) {
    return { status: 400, code: "unsupported_url", message: "That link is not supported." };
  }
  return { status: 502, code: "upstream_error", message: "Extraction failed." };
}

async function handleExtract(req, res, body) {
  const { platform, url } = body;
  if (!url || !hostAllowed(url)) {
    sendError(res, 400, "unsupported_url", "That host is not handled by this service.");
    return;
  }

  const args = ["--dump-single-json", "--no-warnings", "--no-playlist", "--no-progress", "--socket-timeout", "20"];
  const cookies = cookiesFor(platform);
  if (cookies) args.push("--cookies", cookies);
  // The URL goes after "--" as its own argument, and nothing runs through a
  // shell, so a crafted URL cannot become another flag or a command.
  args.push("--", url);

  const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });

  let stdout = "";
  let stderr = "";
  let size = 0;
  let done = false;

  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    child.kill("SIGKILL");
    sendError(res, 504, "timeout", "Extraction took too long.");
  }, EXTRACT_TIMEOUT_MS);

  child.stdout.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      sendError(res, 502, "upstream_error", "Extraction output was too large.");
      return;
    }
    stdout += chunk;
  });

  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4000);
  });

  child.on("error", (error) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const missing = error.code === "ENOENT";
    sendError(
      res,
      missing ? 500 : 502,
      "upstream_error",
      missing ? `yt-dlp not found at "${YTDLP}"` : "Extraction failed to start.",
    );
  });

  child.on("close", (code) => {
    if (done) return;
    done = true;
    clearTimeout(timer);

    if (code !== 0) {
      const mapped = classify(stderr);
      console.error(`[extract] ${mapped.code}: ${stderr.slice(-300)}`);
      sendError(res, mapped.status, mapped.code, mapped.message);
      return;
    }

    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(stdout);
  });
}

/**
 * Streams the media.
 *
 * `attempt` exists because platforms occasionally answer an extraction with a
 * transient error. Headers are only written once the first byte arrives, so a
 * failure before that is safe to retry once.
 */
async function handleStream(req, res, body, options = {}, attempt = 1) {
  const { platform, url, formatId } = body;
  if (!url || !hostAllowed(url)) {
    sendError(res, 400, "unsupported_url", "That host is not handled by this service.");
    return;
  }

  const args = ["--no-warnings", "--no-playlist", "--no-progress", "--socket-timeout", "20"];
  const cookies = cookiesFor(platform);
  if (cookies) args.push("--cookies", cookies);

  // Re-select the rendition the visitor chose, falling back to the best
  // complete file if that id no longer exists.
  const format = typeof formatId === "string" && /^[\w.-]{1,64}$/.test(formatId)
    ? `${formatId}/best[ext=mp4]/best`
    : "best[ext=mp4]/best";
  args.push("-f", format, "-o", "-", "--", url);

  const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });

  let stderr = "";
  let headersSent = false;

  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4000);
  });

  child.stdout.once("data", (chunk) => {
    headersSent = true;
    res.writeHead(200, {
      "content-type": "video/mp4",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(options.filename ? { "content-disposition": contentDisposition(options.filename) } : {}),
    });
    res.write(chunk);
    child.stdout.pipe(res);
  });

  child.on("error", () => {
    if (headersSent) {
      res.destroy();
      return;
    }
    sendError(res, 502, "upstream_error", "Extraction failed to start.");
  });

  child.on("close", (code) => {
    if (headersSent) {
      res.end();
      return;
    }
    if (code !== 0) {
      const mapped = classify(stderr);
      // Retry once for the errors that are usually the platform having a
      // moment. A refusal like private_content will not improve on a retry.
      if (attempt === 1 && mapped.code === "upstream_error") {
        console.warn(`[stream] retrying after: ${stderr.slice(-200)}`);
        setTimeout(() => handleStream(req, res, body, options, 2), 1200);
        return;
      }
      console.error(`[stream] ${mapped.code}: ${stderr.slice(-300)}`);
      sendError(res, mapped.status, mapped.code, mapped.message);
      return;
    }
    sendError(res, 502, "no_media", "No media was produced.");
  });

  // Stop the extraction if the caller hangs up.
  res.on("close", () => child.kill("SIGKILL"));
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  // Followed by the visitor's browser, so it is signature verified rather than
  // token authenticated, and it sends the file as an attachment.
  if (req.method === "GET" && (req.url || "").startsWith("/download")) {
    const token = new URL(req.url, "http://localhost").searchParams.get("token");
    const verified = verifyLinkToken(token);
    if (!verified.ok) {
      console.error(`[download] rejected: ${verified.reason}`);
      sendError(res, 403, "link_expired", "This download link is no longer valid.");
      return;
    }
    const { platform, url, formatId, filename } = verified.payload;
    await handleStream(req, res, { platform, url, formatId }, { filename });
    return;
  }

  if (req.method !== "POST" || !["/extract", "/stream"].includes(req.url || "")) {
    sendError(res, 404, "not_found", "Unknown endpoint.");
    return;
  }

  if (!authorized(req)) {
    sendError(res, 401, "unauthorized", "Missing or invalid token.");
    return;
  }

  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendError(res, 400, "invalid_request", "Body must be JSON.");
    return;
  }

  if (req.url === "/extract") await handleExtract(req, res, body);
  else await handleStream(req, res, body);
});

server.listen(PORT, () => {
  console.log(`SaveGram extractor listening on ${PORT}`);
  if (!TOKEN) console.warn("SAVEGRAM_EXTRACTOR_TOKEN is not set. Do not run this publicly without one.");
});
