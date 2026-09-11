import { hostMatches, normalizeUrl } from "@/lib/url/normalize";
import type { ResolverMedia } from "../resolver";
import type { ProviderContext } from "../types";
import { BaseProvider } from "./base-provider";

const SHORT_HOSTS = ["vm.tiktok.com", "vt.tiktok.com"];

export class TikTokProvider extends BaseProvider {
  readonly id = "tiktok";
  readonly platform = "tiktok";
  protected readonly toolId = "tiktok-video-downloader";

  protected refererUrl(): string {
    return "https://www.tiktok.com/";
  }

  /** vm/vt short links and /t/ redirects are expanded before resolving. */
  protected async prepareUrl(url: string, ctx?: ProviderContext): Promise<string> {
    const normalized = normalizeUrl(url);
    if (!normalized) return url;

    const isShortHost = SHORT_HOSTS.some((host) => hostMatches(normalized.host, host));
    const isShortPath = /^\/t\/[A-Za-z0-9]+$/.test(normalized.path);
    if (!isShortHost && !isShortPath) return url;

    const expanded = await this.expandShortLink(url, ctx);
    return normalizeUrl(expanded)?.href ?? url;
  }

  protected labelFor(media: ResolverMedia, index: number): string {
    if (media.label) return media.label;
    if (media.kind === "image") return `Image ${index + 1}`;
    if (media.kind === "audio") return "Audio track";
    return media.watermarkFree ? "MP4 without watermark" : "MP4 with watermark";
  }

  protected preferenceFor(media: ResolverMedia): number {
    // A clean file is what most people came for, so it outranks resolution.
    return super.preferenceFor(media) + (media.watermarkFree ? 10_000 : 0);
  }
}
