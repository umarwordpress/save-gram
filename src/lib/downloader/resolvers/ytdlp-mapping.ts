import { DownloaderError } from "../errors";
import type { ResolverMedia, ResolverResult } from "../resolver";

/**
 * Maps yt-dlp's info JSON onto the shape providers expect.
 *
 * Kept separate from the process handling so the local resolver and the remote
 * one share a single implementation. The remote extraction service is a thin
 * wrapper that returns yt-dlp's JSON unchanged, which keeps this logic in one
 * place rather than duplicated in a second deployable.
 */
export function mapYtDlpInfo(payload: Record<string, unknown>): ResolverResult {

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

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isHeaders(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
