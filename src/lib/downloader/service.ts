import { getToolByPlatform, getToolBySlug, isToolEnabled } from "@/lib/tools/registry";
import { detectTool } from "@/lib/url/validate";
import { DownloaderError } from "./errors";
import { installDefaultResolver } from "./resolvers";
import { InstagramProvider } from "./providers/instagram-provider";
import { TikTokProvider } from "./providers/tiktok-provider";
import { FacebookProvider } from "./providers/facebook-provider";
import type { DownloaderProvider, ProviderContext, ResolvedMedia } from "./types";

/**
 * The single entry point the API layer uses.
 *
 * The route handlers hold no platform specific logic. A link arrives, the
 * registry says which tool owns it, the service hands it to that tool's
 * provider, and the provider does the rest.
 */
export class DownloaderService {
  private readonly providers = new Map<string, DownloaderProvider>();

  register(provider: DownloaderProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  list(): DownloaderProvider[] {
    return [...this.providers.values()];
  }

  get(providerId: string): DownloaderProvider | undefined {
    return this.providers.get(providerId);
  }

  getForPlatform(platform: string): DownloaderProvider | undefined {
    return this.list().find((provider) => provider.platform === platform);
  }

  /** Provider that claims the URL, used when no tool was named. */
  getForUrl(url: string): DownloaderProvider | undefined {
    const tool = detectTool(url);
    if (tool) return this.providers.get(tool.provider);
    return this.list().find((provider) => provider.canHandle(url));
  }

  /**
   * URL -> validate -> detect platform -> registry -> provider -> resolve.
   *
   * `toolSlug` is passed when the request came from a specific tool page, which
   * lets the error message name the right tool instead of guessing.
   */
  async resolve(
    url: string,
    options: { toolSlug?: string; ctx?: ProviderContext } = {},
  ): Promise<{ media: ResolvedMedia; toolSlug: string; platform: string }> {
    const tool = options.toolSlug ? getToolBySlug(options.toolSlug) : detectTool(url);

    if (!tool) {
      throw new DownloaderError(
        "unsupported_url",
        "No SaveGram tool handles that link yet. Check the tools directory to see what is supported.",
      );
    }

    if (!isToolEnabled(tool)) {
      throw new DownloaderError("tool_unavailable", `The ${tool.name} is not available yet.`);
    }

    const provider = this.providers.get(tool.provider);
    if (!provider) {
      throw new DownloaderError(
        "tool_unavailable",
        `The ${tool.name} is not available right now.`,
        `Tool ${tool.id} names provider ${tool.provider}, which is not registered`,
      );
    }

    const media = await provider.resolve(url, options.ctx);
    return { media, toolSlug: tool.slug, platform: provider.platform };
  }

  /** Provider for a platform, with a clear error when it is missing. */
  requireForPlatform(platform: string): DownloaderProvider {
    const provider = this.getForPlatform(platform);
    if (!provider) {
      const tool = getToolByPlatform(platform);
      throw new DownloaderError(
        "tool_unavailable",
        tool ? `The ${tool.name} is not available right now.` : undefined,
        `No provider registered for platform ${platform}`,
      );
    }
    return provider;
  }
}

// Chooses yt-dlp or an HTTP endpoint from the environment, once per process.
installDefaultResolver();

/**
 * The application's service instance.
 *
 * Adding a platform means adding one line here and one tool config.
 */
export const downloaderService = new DownloaderService()
  .register(new InstagramProvider())
  .register(new TikTokProvider())
  .register(new FacebookProvider());
