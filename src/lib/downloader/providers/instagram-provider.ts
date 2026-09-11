import type { ResolverMedia } from "../resolver";
import { BaseProvider } from "./base-provider";

export class InstagramProvider extends BaseProvider {
  readonly id = "instagram";
  readonly platform = "instagram";
  protected readonly toolId = "instagram-reel-downloader";

  protected refererUrl(): string {
    return "https://www.instagram.com/";
  }

  protected labelFor(media: ResolverMedia, index: number): string {
    if (media.label) return media.label;
    if (media.kind === "image") return `Image ${index + 1}`;
    // Instagram serves a single progressive file per Reel, so the resolution is
    // the only useful distinction when more than one is returned.
    return media.height ? `MP4 ${media.height}p` : "MP4 video";
  }
}
