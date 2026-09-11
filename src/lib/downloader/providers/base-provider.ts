import { getToolById } from "@/lib/tools/registry";
import type { ToolConfig } from "@/lib/tools/types";
import { validateForTool, type ValidationResult } from "@/lib/url/validate";
import { hostMatches, normalizeUrl } from "@/lib/url/normalize";
import { DownloaderError, toDownloaderError } from "../errors";
import { assertSafeMediaResponse, assertSafeMediaUrl, buildFilename } from "../media-validation";
import { getDefaultResolver, type MediaResolver, type ResolverMedia, type ResolverResult } from "../resolver";
import type {
  StreamStrategy,
  DownloadStream,
  DownloaderProvider,
  MediaAsset,
  MediaMetadata,
  ProviderContext,
  ResolvedMedia,
} from "../types";

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
};

/**
 * Shared provider behaviour.
 *
 * A new platform subclasses this and, in the simplest case, only supplies an id,
 * a tool id and a Referer header. Override the hooks below when the platform
 * needs something specific: short link expansion, custom asset labels or a
 * different default file extension.
 */
export abstract class BaseProvider implements DownloaderProvider {
  abstract readonly id: string;
  abstract readonly platform: string;
  /** Tool config that owns this provider's validation rules. */
  protected abstract readonly toolId: string;

  private readonly injectedResolver?: MediaResolver;

  /**
   * Pass a resolver to pin this provider to one backend. Leave it out and the
   * provider reads the default at call time, so swapping the default affects
   * providers that were already constructed.
   */
  constructor(resolver?: MediaResolver) {
    this.injectedResolver = resolver;
  }

  protected get resolver(): MediaResolver {
    return this.injectedResolver ?? getDefaultResolver();
  }

  protected get tool(): ToolConfig {
    const tool = getToolById(this.toolId);
    if (!tool) {
      throw new DownloaderError("tool_unavailable", undefined, `No tool config with id ${this.toolId}`);
    }
    return tool;
  }

  canHandle(url: string): boolean {
    const normalized = normalizeUrl(url, this.tool.validation.preserveQueryKeys);
    if (!normalized) return false;
    return this.tool.validation.hostnames.some((base) => hostMatches(normalized.host, base));
  }

  validate(url: string): ValidationResult {
    return validateForTool(url, this.tool);
  }

  async resolve(url: string, ctx?: ProviderContext): Promise<ResolvedMedia> {
    const validation = this.validate(url);
    if (!validation.ok) {
      const code = validation.code === "tool_unavailable" ? "tool_unavailable" : "invalid_url";
      throw new DownloaderError(code, validation.message);
    }

    const target = await this.prepareUrl(validation.url, ctx);

    let result: ResolverResult;
    try {
      result = await this.resolver.resolve({ platform: this.platform, url: target, signal: ctx?.signal });
    } catch (error) {
      throw toDownloaderError(error);
    }

    const assets = result.media
      .map((item, index) => this.toAsset(item, index, target))
      .filter((asset): asset is MediaAsset => asset !== null)
      .sort((a, b) => b.preference - a.preference);

    if (assets.length === 0) throw new DownloaderError("no_media");

    return {
      metadata: {
        platform: this.platform,
        sourceUrl: target,
        title: result.title,
        author: result.author,
        authorHandle: result.authorHandle,
        thumbnailUrl: result.thumbnailUrl,
        durationSeconds: result.durationSeconds,
        publishedAt: result.publishedAt,
      },
      assets,
      expiresAt: result.expiresAt,
    };
  }

  async getMetadata(url: string, ctx?: ProviderContext): Promise<MediaMetadata> {
    const resolved = await this.resolve(url, ctx);
    return resolved.metadata;
  }

  async download(asset: MediaAsset, ctx?: ProviderContext): Promise<DownloadStream> {
    // A resolver that can serve the file itself is preferred for every asset,
    // not just upstream ones, so no media is proxied through this app.
    const resolver = this.resolver;
    if (resolver.createDownloadUrl) {
      const validation = this.validate(asset.sourceUrl);
      if (!validation.ok) {
        throw new DownloaderError(
          "media_rejected",
          undefined,
          `Download refused for ${asset.sourceUrl}: ${validation.code}`,
        );
      }
      const redirectUrl = await resolver.createDownloadUrl({
        platform: this.platform,
        url: asset.sourceUrl,
        formatId: asset.formatId,
        filename: asset.id,
        signal: ctx?.signal,
      });
      return { redirectUrl, contentType: asset.mimeType, filename: asset.id };
    }

    if (asset.streamVia === "upstream") return this.downloadViaResolver(asset, ctx);
    return this.downloadDirect(asset, ctx);
  }

  /** The resolver streams the file, for CDNs that refuse a handoff. */
  private async downloadViaResolver(asset: MediaAsset, ctx?: ProviderContext): Promise<DownloadStream> {
    // This path hands a URL to the resolver, and yt-dlp accepts a thousand
    // sites. Re-check the post URL against this tool's own rules so a forged
    // token cannot turn the download route into a general purpose fetcher.
    const validation = this.validate(asset.sourceUrl);
    if (!validation.ok) {
      throw new DownloaderError(
        "media_rejected",
        undefined,
        `Upstream stream refused for ${asset.sourceUrl}: ${validation.code}`,
      );
    }

    const resolver = this.resolver;
    if (!resolver.openStream) {
      throw new DownloaderError(
        "upstream_error",
        undefined,
        `Resolver ${resolver.id} cannot stream, but the asset requires it`,
      );
    }

    const stream = await resolver.openStream({
      platform: this.platform,
      url: asset.sourceUrl,
      formatId: asset.formatId,
      signal: ctx?.signal,
    });

    return {
      body: stream.body,
      contentType: stream.contentType || asset.mimeType,
      contentLength: stream.contentLength,
      filename: asset.id,
    };
  }

  /** This server fetches the CDN URL itself. */
  private async downloadDirect(asset: MediaAsset, ctx?: ProviderContext): Promise<DownloadStream> {
    const safeUrl = assertSafeMediaUrl(asset.url, this.platform);

    let response: Response;
    try {
      response = await fetch(safeUrl, {
        headers: { ...this.mediaRequestHeaders(), ...(asset.httpHeaders ?? {}) },
        signal: ctx?.signal,
        cache: "no-store",
        redirect: "follow",
      });
    } catch (error) {
      throw new DownloaderError("upstream_error", undefined, String(error));
    }

    assertSafeMediaResponse(response);
    if (!response.body) throw new DownloaderError("upstream_error", undefined, "Media response had no body");

    const contentLength = Number(response.headers.get("content-length"));

    return {
      body: response.body,
      contentType: response.headers.get("content-type") || asset.mimeType,
      contentLength: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined,
      filename: asset.id ? asset.id : buildFilename([this.platform], asset.extension),
    };
  }

  /* Hooks for subclasses. */

  /**
   * Last step before the resolver is called. Override to expand short links or
   * rewrite a link into the platform's canonical form.
   */
  protected async prepareUrl(url: string, _ctx?: ProviderContext): Promise<string> {
    return url;
  }

  /**
   * Default strategy for this platform's assets. Override to "upstream" where
   * the CDN will not serve a link that another client extracted.
   */
  protected streamStrategy(): StreamStrategy {
    return "direct";
  }

  /** Headers sent when fetching the media file itself. */
  protected mediaRequestHeaders(): Record<string, string> {
    return {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      accept: "*/*",
      referer: this.refererUrl(),
    };
  }

  /** Platform page used as the Referer when fetching media. */
  protected refererUrl(): string {
    return `https://www.${this.tool.validation.hostnames[0]}/`;
  }

  /** Human label for an asset. Override for platform specific wording. */
  protected labelFor(media: ResolverMedia, index: number): string {
    if (media.label) return media.label;
    if (media.kind === "image") return `Image ${index + 1}`;
    if (media.kind === "audio") return "Audio";
    if (media.height) return `${media.height}p`;
    return "Video";
  }

  /** Sort weight. Higher is offered first and used as the default choice. */
  protected preferenceFor(media: ResolverMedia): number {
    let score = media.height ?? 0;
    if (media.kind === "video") score += 1000;
    if (media.watermarkFree) score += 5000;
    return score;
  }

  protected defaultExtension(media: ResolverMedia): string {
    if (media.extension) return media.extension;
    if (media.kind === "image") return "jpg";
    if (media.kind === "audio") return "m4a";
    return "mp4";
  }

  private toAsset(media: ResolverMedia, index: number, sourceUrl: string): MediaAsset | null {
    const streamVia = media.streamVia ?? this.streamStrategy();

    // A direct asset is fetched from its CDN URL by this server, so the URL has
    // to clear the allowlist now. An upstream asset is streamed by the resolver
    // and its CDN URL is never fetched here, so that check does not apply.
    if (streamVia === "direct") {
      try {
        assertSafeMediaUrl(media.url, this.platform);
      } catch {
        return null;
      }
    }

    const extension = this.defaultExtension(media);
    return {
      id: `${this.platform}-${index}`,
      kind: media.kind,
      url: media.url,
      label: this.labelFor(media, index),
      extension,
      mimeType: media.mimeType || MIME_BY_EXTENSION[extension] || "application/octet-stream",
      width: media.width,
      height: media.height,
      durationSeconds: media.durationSeconds,
      sizeBytes: media.sizeBytes,
      preference: this.preferenceFor(media),
      streamVia,
      sourceUrl,
      formatId: media.formatId,
      httpHeaders: media.httpHeaders,
    };
  }

  /** Follow a short link to its destination without downloading a body. */
  protected async expandShortLink(url: string, ctx?: ProviderContext): Promise<string> {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: ctx?.signal,
        cache: "no-store",
        headers: { "user-agent": this.mediaRequestHeaders()["user-agent"] },
      });
      return response.url || url;
    } catch {
      // A failed expansion is not fatal; the resolver may handle the short form.
      return url;
    }
  }
}
