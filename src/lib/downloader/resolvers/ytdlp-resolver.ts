import { spawn } from "node:child_process";
import { DownloaderError } from "../errors";
import type {
  MediaResolver,
  ResolverInput,
  ResolverMedia,
  ResolverResult,
  StreamInput,
  UpstreamStream,
} from "../resolver";

/**
 * Extraction backed by yt-dlp.
 *
 * yt-dlp is a maintained project that tracks these platforms as they change,
 * which is the part no architecture here can solve on its own. It runs as a
 * subprocess, so this resolver needs a real Node server with the binary on
 * PATH. It will not work on a serverless platform.
 */

const DEFAULT_TIMEOUT_MS = 45_000;
/** Extraction JSON is large. Anything past this is a runaway process. */
const MAX_JSON_BYTES = 32 * 1024 * 1024;

export interface YtDlpOptions {
  /** Path to the binary. Defaults to `yt-dlp` on PATH. */
  binary?: string;
  timeoutMs?: number;
  /** Netscape cookie file. Instagram needs one; the others do not. */
  cookiesFile?: string;
}

export class YtDlpResolver implements MediaResolver {
  readonly id = "ytdlp";
  private readonly options: YtDlpOptions;

  constructor(options: YtDlpOptions = {}) {
    this.options = options;
  }

  private binary(): string {
    return this.options.binary || process.env.SAVEGRAM_YTDLP_PATH || "yt-dlp";
  }

  private cookiesFor(platform: string): string | undefined {
    const specific = process.env[`SAVEGRAM_YTDLP_COOKIES_${platform.toUpperCase()}`];
    return specific || this.options.cookiesFile || process.env.SAVEGRAM_YTDLP_COOKIES || undefined;
  }

  async resolve(input: ResolverInput): Promise<ResolverResult> {
    const args = [
      "--dump-single-json",
      "--no-warnings",
      "--no-playlist",
      "--no-progress",
      "--socket-timeout",
      "20",
    ];

    const cookies = this.cookiesFor(input.platform);
    if (cookies) args.push("--cookies", cookies);

    // The URL is always the final argument and is passed as its own array
    // element. Nothing here goes through a shell, so a crafted URL cannot
    // become another argument or a command.
    args.push("--", input.url);

    const raw = await this.run(args, input.signal);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new DownloaderError("upstream_error", undefined, "yt-dlp did not return JSON");
    }

    return this.toResult(payload);
  }

  /** Turns yt-dlp's info JSON into the shape the providers expect. */
  private toResult(payload: Record<string, unknown>): ResolverResult {
    const formats = Array.isArray(payload.formats) ? (payload.formats as Record<string, unknown>[]) : [];

    const usable = formats
      .filter((format) => typeof format.url === "string")
      // Keep complete files. Audio only and video only fragments would need
      // muxing, which this server does not do.
      .filter((format) => format.vcodec !== "none" && format.acodec !== "none")
      .filter((format) => format.ext === "mp4" || format.ext === "webm");

    // H.264 plays everywhere; H.265 does not. When a platform publishes the
    // same resolution in both, the widely compatible one is the one to keep.
    const rank = (format: Record<string, unknown>) =>
      typeof format.vcodec === "string" && /^(avc|h264)/i.test(format.vcodec) ? 0 : 1;

    const media: ResolverMedia[] = [];
    const seen = new Set<string>();

    for (const format of [...usable].sort((a, b) => rank(a) - rank(b))) {
      const width = num(format.width);
      const height = num(format.height);
      // yt-dlp notes the watermarked rendition; the rest are clean.
      const watermarked =
        typeof format.format_note === "string" && /watermark/i.test(format.format_note);

      // Vertical video reports height 1920 for what everyone calls 1080p, so
      // name it by the smaller side, which is also how TikTok labels its own.
      const quality = width && height ? Math.min(width, height) : height;

      const formatId = typeof format.format_id === "string" ? format.format_id : undefined;
      const formatNote = typeof format.format_note === "string" ? format.format_note : formatId;

      // Facebook reports no dimensions, so quality alone would collapse its HD
      // and SD renditions into one. Fall back to the format id there.
      const key = `${quality ?? formatId ?? "na"}-${watermarked}`;
      if (seen.has(key)) continue;
      seen.add(key);

      media.push({
        kind: "video",
        url: format.url as string,
        formatId,
        formatNote,
        extension: typeof format.ext === "string" ? format.ext : "mp4",
        height: quality,
        width,
        sizeBytes: num(format.filesize) ?? num(format.filesize_approx),
        httpHeaders: isHeaders(format.http_headers) ? format.http_headers : undefined,
        watermarkFree: !watermarked,
      });
    }

    if (media.length === 0) throw new DownloaderError("no_media");
    const unique = media;

    return {
      title: str(payload.title),
      author: str(payload.uploader) ?? str(payload.channel),
      authorHandle: str(payload.uploader_id),
      thumbnailUrl: str(payload.thumbnail),
      durationSeconds: num(payload.duration),
      publishedAt: str(payload.upload_date),
      media: unique,
    };
  }

  /** Runs yt-dlp and returns stdout, mapping its failures onto our errors. */
  private run(args: string[], signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary(), args, { stdio: ["ignore", "pipe", "pipe"] });

      let stdout = "";
      let stderr = "";
      let size = 0;
      let settled = false;

      const finish = (error?: DownloaderError, value?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill("SIGKILL");
        if (error) reject(error);
        else resolve(value ?? "");
      };

      const timer = setTimeout(
        () => finish(new DownloaderError("timeout", undefined, "yt-dlp timed out")),
        this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );

      signal?.addEventListener("abort", () => finish(new DownloaderError("timeout")), { once: true });

      child.stdout.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_JSON_BYTES) {
          finish(new DownloaderError("upstream_error", undefined, "yt-dlp output was too large"));
          return;
        }
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer) => {
        // Keep only the tail; extraction can be chatty.
        stderr = (stderr + chunk.toString()).slice(-4000);
      });

      child.on("error", (error) => {
        const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
        finish(
          new DownloaderError(
            missing ? "resolver_not_configured" : "resolver_unavailable",
            missing ? "Downloads are not switched on in this deployment." : undefined,
            missing ? `yt-dlp binary not found at "${this.binary()}"` : String(error),
          ),
        );
      });

      child.on("close", (code) => {
        if (code === 0) {
          finish(undefined, stdout);
          return;
        }
        finish(classifyStderr(stderr));
      });
    });
  }

  /**
   * Streams the media through yt-dlp.
   *
   * Used where the CDN will not honour a link handed to another client. yt-dlp
   * re-extracts, reuses its own session and writes the file to stdout, which is
   * piped to the browser. Nothing is buffered in memory or written to disk.
   */
  async openStream(input: StreamInput): Promise<UpstreamStream> {
    const args = ["--no-warnings", "--no-playlist", "--no-progress", "--socket-timeout", "20"];

    const cookies = this.cookiesFor(input.platform);
    if (cookies) args.push("--cookies", cookies);

    // Re-select the exact rendition the user chose, falling back to the best
    // complete file if that id is gone by the time they click download.
    args.push("-f", input.formatId ? `${input.formatId}/best[ext=mp4]/best` : "best[ext=mp4]/best");
    args.push("-o", "-", "--", input.url);

    const child = spawn(this.binary(), args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });

    // Surface a startup failure (bad URL, missing binary) as an error rather
    // than as an empty download, by waiting for the first byte.
    const firstChunk = await new Promise<Buffer | null>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        cleanup();
        resolve(chunk);
      };
      const onClose = () => {
        cleanup();
        resolve(null);
      };
      const onError = (error: NodeJS.ErrnoException) => {
        cleanup();
        reject(
          new DownloaderError(
            error.code === "ENOENT" ? "resolver_not_configured" : "resolver_unavailable",
            undefined,
            String(error),
          ),
        );
      };
      function cleanup() {
        child.stdout.off("data", onData);
        child.off("close", onClose);
        child.off("error", onError);
      }
      child.stdout.on("data", onData);
      child.on("close", onClose);
      child.on("error", onError);
      input.signal?.addEventListener("abort", () => child.kill("SIGKILL"), { once: true });
    });

    if (!firstChunk) {
      child.kill("SIGKILL");
      throw classifyStderr(stderr);
    }

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(firstChunk));
        child.stdout.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        child.stdout.on("end", () => {
          try {
            controller.close();
          } catch {
            // Already closed because the client went away.
          }
        });
        child.on("error", () => {
          try {
            controller.error(new DownloaderError("upstream_error"));
          } catch {
            // Stream already torn down.
          }
        });
      },
      cancel() {
        // The visitor cancelled the download, so stop the extraction too.
        child.kill("SIGKILL");
      },
    });

    return { body, contentType: "video/mp4" };
  }
}


/** Maps yt-dlp's stderr onto an error the user can act on. */
export function classifyStderr(stderr: string): DownloaderError {
  const text = stderr.toLowerCase();

  if (text.includes("login required") || text.includes("empty media response") || text.includes("--cookies")) {
    return new DownloaderError(
      "private_content",
      "This platform now requires a signed in session to read media, and this deployment does not have one configured.",
      stderr.slice(-400),
    );
  }
  if (text.includes("private") || text.includes("not authorized") || text.includes("forbidden")) {
    return new DownloaderError("private_content", undefined, stderr.slice(-400));
  }
  if (text.includes("not available") || text.includes("unavailable") || text.includes("removed") || text.includes("404")) {
    return new DownloaderError("not_found", undefined, stderr.slice(-400));
  }
  if (text.includes("rate") && text.includes("limit")) {
    return new DownloaderError("rate_limited", undefined, stderr.slice(-400));
  }
  if (text.includes("unsupported url")) {
    return new DownloaderError("unsupported_url", undefined, stderr.slice(-400));
  }
  return new DownloaderError("upstream_error", undefined, stderr.slice(-400) || "yt-dlp failed");
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isHeaders(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
