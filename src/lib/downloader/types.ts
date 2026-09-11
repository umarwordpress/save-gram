export type MediaKind = "video" | "image" | "audio";

export interface MediaAsset {
  /** Stable id within one resolve result, used to request the download. */
  id: string;
  kind: MediaKind;
  /** Direct URL on the platform CDN. Short lived on every platform we support. */
  url: string;
  /** Shown on the button, for example "HD" or "Without watermark". */
  label: string;
  /** Container extension for the saved file. */
  extension: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sizeBytes?: number;
  /** Higher wins when picking a default. */
  preference: number;
}

export interface MediaMetadata {
  platform: string;
  /** Canonical link to the original post. */
  sourceUrl: string;
  title?: string;
  author?: string;
  authorHandle?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
}

export interface ResolvedMedia {
  metadata: MediaMetadata;
  assets: MediaAsset[];
  /** When the CDN links stop working, as an ISO timestamp. */
  expiresAt?: string;
}

export interface ProviderContext {
  /** Abort signal from the incoming request. */
  signal?: AbortSignal;
}

export interface DownloadStream {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
  filename: string;
}

/**
 * The contract every platform implements. The API layer talks only to this, so
 * adding a platform never means editing the route handlers.
 */
export interface DownloaderProvider {
  /** Matches the `provider` field of one or more tool configs. */
  readonly id: string;
  readonly platform: string;

  /** Cheap host and path check with no network access. */
  canHandle(url: string): boolean;

  /** Full validation against the tool's rules. */
  validate(url: string): import("@/lib/url/validate").ValidationResult;

  /** Resolve a post URL into downloadable assets. */
  resolve(url: string, ctx?: ProviderContext): Promise<ResolvedMedia>;

  /** Metadata only, for previews. Defaults to the metadata from resolve. */
  getMetadata(url: string, ctx?: ProviderContext): Promise<MediaMetadata>;

  /** Open a stream for one resolved asset. */
  download(asset: MediaAsset, ctx?: ProviderContext): Promise<DownloadStream>;
}
