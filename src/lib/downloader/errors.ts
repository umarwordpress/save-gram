export type DownloaderErrorCode =
  | "invalid_url"
  | "unsupported_url"
  | "tool_unavailable"
  | "not_found"
  | "private_content"
  | "no_media"
  | "rate_limited"
  | "resolver_unavailable"
  | "resolver_not_configured"
  | "upstream_error"
  | "media_rejected"
  | "link_expired"
  | "timeout";

const STATUS: Record<DownloaderErrorCode, number> = {
  invalid_url: 400,
  unsupported_url: 400,
  tool_unavailable: 404,
  not_found: 404,
  private_content: 403,
  no_media: 422,
  rate_limited: 429,
  resolver_unavailable: 503,
  resolver_not_configured: 503,
  upstream_error: 502,
  media_rejected: 422,
  link_expired: 410,
  timeout: 504,
};

/** Wording shown to the user when a provider does not supply its own. */
const DEFAULT_MESSAGE: Record<DownloaderErrorCode, string> = {
  invalid_url: "That link could not be read. Copy it again and paste the full address.",
  unsupported_url: "No SaveGram tool handles that link yet.",
  tool_unavailable: "This tool is not available right now.",
  not_found: "Nothing was found at that link. It may have been deleted.",
  private_content: "That post is not public, so it cannot be read without signing in.",
  no_media: "No downloadable video was found at that link.",
  rate_limited: "Too many requests from this connection. Wait a moment and try again.",
  resolver_unavailable: "The service that reads this platform is not responding. Try again shortly.",
  resolver_not_configured: "Downloads for this platform are not switched on in this deployment.",
  upstream_error: "The platform returned an unexpected response. Try again shortly.",
  media_rejected: "The media at that link failed a safety check and was not served.",
  link_expired: "That download link has expired. Resolve the post again.",
  timeout: "The request took too long. Try again.",
};

export class DownloaderError extends Error {
  readonly code: DownloaderErrorCode;
  readonly status: number;
  /** Extra detail for server logs, never sent to the browser. */
  readonly detail?: string;

  constructor(code: DownloaderErrorCode, message?: string, detail?: string) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.name = "DownloaderError";
    this.code = code;
    this.status = STATUS[code];
    this.detail = detail;
  }
}

export function toDownloaderError(error: unknown): DownloaderError {
  if (error instanceof DownloaderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new DownloaderError("timeout");
  }
  return new DownloaderError("upstream_error", undefined, String(error));
}
