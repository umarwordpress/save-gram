import { DownloaderError } from "./errors";
import type { MediaAsset, ResolvedMedia } from "./types";

/**
 * Extraction backend.
 *
 * Reading media out of a social platform is the one part of this system that
 * cannot be made stable by architecture, because none of the supported
 * platforms publish a download API and their private endpoints change without
 * notice. That work is isolated behind this interface so a provider never
 * depends on how extraction happens. Swap the implementation per platform and
 * nothing else in the app changes.
 */
export interface MediaResolver {
  readonly id: string;
  resolve(input: ResolverInput): Promise<ResolverResult>;
}

export interface ResolverInput {
  platform: string;
  /** Normalized post URL. */
  url: string;
  signal?: AbortSignal;
}

/** What a resolver must return. Providers map this onto ResolvedMedia. */
export interface ResolverResult {
  title?: string;
  author?: string;
  authorHandle?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
  expiresAt?: string;
  media: ResolverMedia[];
}

export interface ResolverMedia {
  kind: MediaAsset["kind"];
  url: string;
  label?: string;
  mimeType?: string;
  extension?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  durationSeconds?: number;
  /** Set by TikTok style sources that publish a clean master. */
  watermarkFree?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Calls an HTTP extraction service.
 *
 * Configure one endpoint for everything with SAVEGRAM_RESOLVER_ENDPOINT, or one
 * per platform with SAVEGRAM_RESOLVER_ENDPOINT_INSTAGRAM and friends. The
 * endpoint receives { platform, url } as JSON and answers with a ResolverResult.
 */
export class HttpMediaResolver implements MediaResolver {
  readonly id = "http";

  private endpointFor(platform: string): string | undefined {
    const key = `SAVEGRAM_RESOLVER_ENDPOINT_${platform.toUpperCase()}`;
    return process.env[key] || process.env.SAVEGRAM_RESOLVER_ENDPOINT || undefined;
  }

  private tokenFor(platform: string): string | undefined {
    const key = `SAVEGRAM_RESOLVER_TOKEN_${platform.toUpperCase()}`;
    return process.env[key] || process.env.SAVEGRAM_RESOLVER_TOKEN || undefined;
  }

  async resolve(input: ResolverInput): Promise<ResolverResult> {
    const endpoint = this.endpointFor(input.platform);
    if (!endpoint) {
      throw new DownloaderError(
        "resolver_not_configured",
        undefined,
        `No resolver endpoint configured for ${input.platform}`,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    input.signal?.addEventListener("abort", () => controller.abort(), { once: true });

    let response: Response;
    try {
      const token = this.tokenFor(input.platform);
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ platform: input.platform, url: input.url }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      throw new DownloaderError("resolver_unavailable", undefined, String(error));
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404) throw new DownloaderError("not_found");
    if (response.status === 403 || response.status === 401) throw new DownloaderError("private_content");
    if (response.status === 429) throw new DownloaderError("rate_limited");
    if (!response.ok) {
      throw new DownloaderError("upstream_error", undefined, `Resolver returned ${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new DownloaderError("upstream_error", undefined, `Resolver sent invalid JSON: ${error}`);
    }

    return parseResolverResult(payload);
  }
}

/** Validates the resolver response so a bad backend cannot corrupt the app. */
export function parseResolverResult(payload: unknown): ResolverResult {
  if (!payload || typeof payload !== "object") {
    throw new DownloaderError("upstream_error", undefined, "Resolver response was not an object");
  }
  const raw = payload as Record<string, unknown>;
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];

  const media: ResolverMedia[] = mediaRaw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .filter((item) => typeof item.url === "string" && item.url.length > 0)
    .map((item) => ({
      kind: item.kind === "image" || item.kind === "audio" ? item.kind : "video",
      url: item.url as string,
      label: typeof item.label === "string" ? item.label : undefined,
      mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
      extension: typeof item.extension === "string" ? item.extension : undefined,
      width: numberOrUndefined(item.width),
      height: numberOrUndefined(item.height),
      sizeBytes: numberOrUndefined(item.sizeBytes),
      durationSeconds: numberOrUndefined(item.durationSeconds),
      watermarkFree: item.watermarkFree === true,
    }));

  if (media.length === 0) throw new DownloaderError("no_media");

  return {
    title: stringOrUndefined(raw.title),
    author: stringOrUndefined(raw.author),
    authorHandle: stringOrUndefined(raw.authorHandle),
    thumbnailUrl: stringOrUndefined(raw.thumbnailUrl),
    durationSeconds: numberOrUndefined(raw.durationSeconds),
    publishedAt: stringOrUndefined(raw.publishedAt),
    expiresAt: stringOrUndefined(raw.expiresAt),
    media,
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

let defaultResolver: MediaResolver = new HttpMediaResolver();

export function getDefaultResolver(): MediaResolver {
  return defaultResolver;
}

/** Swap the backend, for tests or for a self hosted extractor. */
export function setDefaultResolver(resolver: MediaResolver): void {
  defaultResolver = resolver;
}

export type { ResolvedMedia };
