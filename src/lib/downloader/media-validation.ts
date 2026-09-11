import { DownloaderError } from "./errors";

/**
 * Media validation.
 *
 * Resolver responses contain URLs that this server will fetch, which makes them
 * untrusted input. Anything not on the platform's CDN allowlist is refused so a
 * compromised or misbehaving resolver cannot point the server at an internal
 * address or at an unrelated host.
 */
const CDN_ALLOWLIST: Record<string, string[]> = {
  instagram: ["cdninstagram.com", "fbcdn.net", "instagram.com"],
  tiktok: ["tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "ibyteimg.com", "byteoversea.com", "muscdn.com", "tiktok.com"],
  facebook: ["fbcdn.net", "facebook.com", "fbsbx.com"],
};

const ALLOWED_MIME_PREFIXES = ["video/", "image/", "audio/", "application/octet-stream"];

/** 600 MB. Well above any Reel or TikTok, low enough to stop a runaway stream. */
export const MAX_MEDIA_BYTES = 600 * 1024 * 1024;

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^f[cd][0-9a-f]{2}:/i,
  /^fe80:/i,
];

/** Register CDN hosts for a new platform without touching this file's callers. */
export function registerCdnHosts(platform: string, hosts: string[]): void {
  CDN_ALLOWLIST[platform] = [...(CDN_ALLOWLIST[platform] ?? []), ...hosts];
}

/**
 * Check a media URL before the server fetches it. Returns the parsed URL so the
 * caller uses the validated value rather than the original string.
 */
export function assertSafeMediaUrl(rawUrl: string, platform: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new DownloaderError("media_rejected", undefined, "Media URL could not be parsed");
  }

  if (url.protocol !== "https:") {
    throw new DownloaderError("media_rejected", undefined, `Refused non https media URL: ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase();

  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(host)) || host === "localhost") {
    throw new DownloaderError("media_rejected", undefined, `Refused private host: ${host}`);
  }

  const allowed = CDN_ALLOWLIST[platform];
  if (!allowed || allowed.length === 0) {
    throw new DownloaderError("media_rejected", undefined, `No CDN allowlist for platform ${platform}`);
  }

  const hostAllowed = allowed.some((base) => host === base || host.endsWith(`.${base}`));
  if (!hostAllowed) {
    throw new DownloaderError("media_rejected", undefined, `Host ${host} is not on the ${platform} allowlist`);
  }

  return url;
}

/** Check the response headers before streaming any bytes to the user. */
export function assertSafeMediaResponse(response: Response): void {
  if (response.status === 403 || response.status === 410) {
    throw new DownloaderError("link_expired");
  }
  if (!response.ok) {
    throw new DownloaderError("upstream_error", undefined, `Media fetch returned ${response.status}`);
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (contentType && !ALLOWED_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix))) {
    throw new DownloaderError("media_rejected", undefined, `Unexpected content type: ${contentType}`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES) {
    throw new DownloaderError("media_rejected", undefined, `Media is ${contentLength} bytes, over the limit`);
  }
}

/** Build a safe filename for the Content-Disposition header. */
export function buildFilename(parts: Array<string | undefined>, extension: string): string {
  const base = parts
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join("-")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .toLowerCase();

  const safeBase = base || "savegram-download";
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4";
  return `${safeBase}.${safeExt}`;
}
