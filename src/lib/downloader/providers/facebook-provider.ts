import { hostMatches, normalizeUrl } from "@/lib/url/normalize";
import type { ResolverMedia } from "../resolver";
import type { ProviderContext } from "../types";
import { BaseProvider } from "./base-provider";

export class FacebookProvider extends BaseProvider {
  readonly id = "facebook";
  readonly platform = "facebook";
  protected readonly toolId = "facebook-reel-downloader";

  protected refererUrl(): string {
    return "https://www.facebook.com/";
  }

  /** fb.watch links redirect to the real video page. */
  protected async prepareUrl(url: string, ctx?: ProviderContext): Promise<string> {
    const normalized = normalizeUrl(url, ["v"]);
    if (!normalized) return url;
    if (!hostMatches(normalized.host, "fb.watch") && !hostMatches(normalized.host, "fb.com")) {
      return url;
    }
    const expanded = await this.expandShortLink(url, ctx);
    return normalizeUrl(expanded, ["v"])?.href ?? url;
  }

  protected preferenceFor(media: ResolverMedia): number {
    // Without dimensions the base score cannot separate the renditions.
    const note = (media.formatNote ?? "").toLowerCase();
    return super.preferenceFor(media) + (note.includes("hd") ? 500 : 0);
  }

  protected labelFor(media: ResolverMedia, index: number): string {
    if (media.label) return media.label;
    if (media.kind === "image") return `Image ${index + 1}`;
    // Facebook publishes named renditions and often reports no dimensions at
    // all, so its own hd and sd tags are the reliable signal.
    const note = (media.formatNote ?? "").toLowerCase();
    if (note.includes("hd")) return media.height ? `HD ${media.height}p` : "HD video";
    if (note.includes("sd")) return media.height ? `SD ${media.height}p` : "SD video";
    if (media.height) return media.height >= 720 ? `HD ${media.height}p` : `SD ${media.height}p`;
    return "MP4 video";
  }
}
