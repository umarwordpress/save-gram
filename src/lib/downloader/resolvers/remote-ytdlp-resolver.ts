import { createHmac } from "node:crypto";
import { DownloaderError } from "../errors";
import type {
  MediaResolver,
  ResolverInput,
  ResolverResult,
  StreamInput,
  UpstreamStream,
} from "../resolver";
import { mapYtDlpInfo } from "./ytdlp-mapping";

/**
 * Extraction on a separate service.
 *
 * For hosts that cannot run a binary, such as Vercel functions. The service in
 * services/extractor runs yt-dlp and exposes two endpoints; this client calls
 * them. Format mapping happens here rather than there, so the service stays a
 * thin wrapper and the mapping logic lives in one place.
 */
const RESOLVE_TIMEOUT_MS = 45_000;

export class RemoteYtDlpResolver implements MediaResolver {
  readonly id = "remote-ytdlp";

  private baseUrl(): string {
    const url = process.env.SAVEGRAM_EXTRACTOR_URL;
    if (!url) {
      throw new DownloaderError(
        "resolver_not_configured",
        undefined,
        "SAVEGRAM_EXTRACTOR_URL is not set",
      );
    }
    return url.replace(/\/$/, "");
  }

  private headers(): Record<string, string> {
    const token = process.env.SAVEGRAM_EXTRACTOR_TOKEN;
    return {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  async resolve(input: ResolverInput): Promise<ResolverResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
    input.signal?.addEventListener("abort", () => controller.abort(), { once: true });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}/extract`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ platform: input.platform, url: input.url }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      throw new DownloaderError("resolver_unavailable", undefined, String(error));
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw await this.toError(response);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new DownloaderError("upstream_error", undefined, `Extractor sent invalid JSON: ${error}`);
    }

    if (!payload || typeof payload !== "object") {
      throw new DownloaderError("upstream_error", undefined, "Extractor response was not an object");
    }

    return mapYtDlpInfo(payload as Record<string, unknown>);
  }

  /**
   * The service streams the media back.
   *
   * Used for TikTok, whose CDN links only work for the session that extracted
   * them. The bytes pass through the service and then through this app, so the
   * visitor never needs a link the CDN would refuse.
   */
  async openStream(input: StreamInput): Promise<UpstreamStream> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}/stream`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          platform: input.platform,
          url: input.url,
          formatId: input.formatId,
        }),
        signal: input.signal,
        cache: "no-store",
      });
    } catch (error) {
      throw new DownloaderError("resolver_unavailable", undefined, String(error));
    }

    if (!response.ok) throw await this.toError(response);
    if (!response.body) {
      throw new DownloaderError("upstream_error", undefined, "Extractor stream had no body");
    }

    const length = Number(response.headers.get("content-length"));

    return {
      body: response.body,
      contentType: response.headers.get("content-type") || "video/mp4",
      contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
    };
  }

  /**
   * Signs a link the browser can follow straight to the extraction service.
   *
   * The media then goes from the service to the visitor without passing through
   * this app, which matters on hosts that cap response size or function
   * duration. The service verifies this signature with the same secret, so the
   * endpoint is not open to anyone who finds the URL.
   */
  async createDownloadUrl(input: StreamInput & { filename: string }): Promise<string> {
    const secret = process.env.SAVEGRAM_TOKEN_SECRET;
    if (!secret || secret.length < 16) {
      throw new DownloaderError(
        "tool_unavailable",
        "Downloads are not configured on this deployment.",
        "SAVEGRAM_TOKEN_SECRET must be set and shared with the extraction service",
      );
    }

    const payload = {
      platform: input.platform,
      url: input.url,
      formatId: input.formatId,
      filename: input.filename,
      exp: Math.floor(Date.now() / 1000) + 30 * 60,
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", secret).update(encoded).digest("base64url");

    return `${this.baseUrl()}/download?token=${encodeURIComponent(`${encoded}.${signature}`)}`;
  }

  /** The service reports our own error codes, so pass them through. */
  private async toError(response: Response): Promise<DownloaderError> {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code;
      message = body.error?.message;
    } catch {
      // Non JSON error body, fall through to the status mapping.
    }

    const known = [
      "not_found",
      "private_content",
      "no_media",
      "rate_limited",
      "unsupported_url",
      "timeout",
      "upstream_error",
    ];
    if (code && known.includes(code)) {
      return new DownloaderError(code as never, message, `Extractor returned ${code}`);
    }

    if (response.status === 401 || response.status === 403) {
      return new DownloaderError(
        "resolver_not_configured",
        undefined,
        "Extractor rejected the token. Check SAVEGRAM_EXTRACTOR_TOKEN on both sides.",
      );
    }
    if (response.status === 404) return new DownloaderError("not_found");
    if (response.status === 429) return new DownloaderError("rate_limited");

    return new DownloaderError("upstream_error", undefined, `Extractor returned ${response.status}`);
  }
}
