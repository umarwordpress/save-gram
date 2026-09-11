import { NextResponse } from "next/server";
import { downloaderService } from "@/lib/downloader/service";
import { createDownloadToken } from "@/lib/downloader/download-token";
import { DownloaderError, toDownloaderError } from "@/lib/downloader/errors";
import { buildFilename } from "@/lib/downloader/media-validation";
import { getToolBySlug } from "@/lib/tools/registry";
import { clientKey, pruneRateLimits, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  pruneRateLimits();
  const limit = rateLimit(`resolve:${clientKey(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return errorResponse(new DownloaderError("rate_limited"), limit.resetAt);
  }

  let body: { url?: unknown; tool?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(new DownloaderError("invalid_url", "The request could not be read."));
  }

  const url = typeof body.url === "string" ? body.url : "";
  const toolSlug = typeof body.tool === "string" ? body.tool : undefined;

  if (!url.trim()) {
    return errorResponse(new DownloaderError("invalid_url", "Paste a link to get started."));
  }
  if (url.length > 2048) {
    return errorResponse(new DownloaderError("invalid_url", "That link is too long to be valid."));
  }

  try {
    const { media, toolSlug: resolvedSlug, platform } = await downloaderService.resolve(url, {
      toolSlug,
      ctx: { signal: request.signal },
    });

    const tool = getToolBySlug(resolvedSlug);

    return NextResponse.json(
      {
        ok: true,
        tool: tool ? { slug: tool.slug, name: tool.name, platform: tool.platform } : null,
        platform,
        metadata: {
          title: media.metadata.title ?? null,
          author: media.metadata.author ?? null,
          authorHandle: media.metadata.authorHandle ?? null,
          thumbnailUrl: media.metadata.thumbnailUrl ?? null,
          durationSeconds: media.metadata.durationSeconds ?? null,
          sourceUrl: media.metadata.sourceUrl,
        },
        // The CDN URL stays on the server. The client only ever sees a token.
        assets: media.assets.map((asset) => {
          const filename = buildFilename(
            [platform, media.metadata.author ?? media.metadata.authorHandle, media.metadata.title],
            asset.extension,
          );
          return {
            id: asset.id,
            label: asset.label,
            kind: asset.kind,
            extension: asset.extension,
            width: asset.width ?? null,
            height: asset.height ?? null,
            sizeBytes: asset.sizeBytes ?? null,
            filename,
            downloadUrl: `/api/download?token=${encodeURIComponent(
              createDownloadToken({
                url: asset.url,
                platform,
                filename,
                mimeType: asset.mimeType,
                streamVia: asset.streamVia,
                sourceUrl: asset.sourceUrl,
                formatId: asset.formatId,
              }),
            )}`,
          };
        }),
        expiresAt: media.expiresAt ?? null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const downloaderError = toDownloaderError(error);
    if (downloaderError.detail) {
      console.error(`[resolve] ${downloaderError.code}: ${downloaderError.detail}`);
    }
    return errorResponse(downloaderError);
  }
}

function errorResponse(error: DownloaderError, retryAt?: number) {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (retryAt) headers["retry-after"] = String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000)));

  return NextResponse.json(
    { ok: false, error: { code: error.code, message: error.message } },
    { status: error.status, headers },
  );
}
