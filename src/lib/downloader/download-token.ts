import { createHmac, timingSafeEqual } from "node:crypto";
import { DownloaderError } from "./errors";

/**
 * Short lived download tokens.
 *
 * A resolve response never hands the client a raw CDN URL. It hands out a signed
 * token that this server can exchange for the file, which keeps the platform
 * link out of the page, lets the media checks run on every download, and makes
 * the link stop working on its own.
 */
export interface DownloadTokenPayload {
  /** Media URL on the platform CDN. Empty for upstream streamed assets. */
  url: string;
  platform: string;
  filename: string;
  mimeType: string;
  /** How the server should fetch the bytes. */
  streamVia: import("./types").StreamStrategy;
  /** Post URL, needed to re-extract when streaming upstream. */
  sourceUrl: string;
  /** Rendition the user picked. */
  formatId?: string;
  /** Expiry as a unix timestamp in seconds. */
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60 * 30;

function secret(): string {
  const configured = process.env.SAVEGRAM_TOKEN_SECRET;
  if (configured && configured.length >= 16) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new DownloaderError(
      "tool_unavailable",
      "Downloads are not configured on this deployment.",
      "SAVEGRAM_TOKEN_SECRET is missing or too short in production",
    );
  }
  // Development only, so the app runs without setup.
  return "savegram-development-secret-do-not-use-in-production";
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createDownloadToken(
  payload: Omit<DownloadTokenPayload, "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const body: DownloadTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64url(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyDownloadToken(token: string): DownloadTokenPayload {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new DownloaderError("link_expired", undefined, "Malformed download token");
  }

  const expected = Buffer.from(sign(encoded));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new DownloaderError("link_expired", undefined, "Download token signature did not match");
  }

  let payload: DownloadTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new DownloaderError("link_expired", undefined, "Download token payload was not JSON");
  }

  const hasTarget = payload.streamVia === "upstream" ? !!payload.sourceUrl : !!payload.url;
  if (!hasTarget || !payload.platform || typeof payload.exp !== "number") {
    throw new DownloaderError("link_expired", undefined, "Download token was missing fields");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new DownloaderError("link_expired");
  }

  return payload;
}
