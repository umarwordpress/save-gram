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

  protected labelFor(media: ResolverMedia, index: number): string {
    if (media.label) return media.label;
    if (media.kind === "image") return `Image ${index + 1}`;
    // Facebook publishes renditions rather than one file, so name them the way
    // Facebook does instead of by pixel height alone.
    if (media.height && media.height >= 720) return `HD ${media.height}p`;
    return media.height ? `SD ${media.height}p` : "SD video";
  }
}
