import { NextResponse } from "next/server";
import { verifyDownloadToken } from "@/lib/downloader/download-token";
import { downloaderService } from "@/lib/downloader/service";
import { DownloaderError, toDownloaderError } from "@/lib/downloader/errors";
import { clientKey, pruneRateLimits, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/**
 * Exchanges a signed token for the file.
 *
 * The bytes are streamed straight through to the browser. Nothing is written to
 * disk and nothing is cached, so the server holds the media only for as long as
 * the response is in flight.
 */
export async function GET(request: Request) {
  pruneRateLimits();
  const limit = rateLimit(`download:${clientKey(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "rate_limited", message: "Too many downloads. Wait a moment and try again." } },
      { status: 429, headers: { "cache-control": "no-store" } },
    );
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { code: "link_expired", message: "This download link is missing its token." } },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const payload = verifyDownloadToken(token);
    const provider = downloaderService.requireForPlatform(payload.platform);

    const stream = await provider.download(
      {
        id: payload.filename,
        kind: "video",
        url: payload.url,
        label: "download",
        extension: payload.filename.split(".").pop() || "mp4",
        mimeType: payload.mimeType,
        preference: 0,
        streamVia: payload.streamVia ?? "direct",
        sourceUrl: payload.sourceUrl ?? payload.url,
        formatId: payload.formatId,
      },
      { signal: request.signal },
    );

    // The resolver is serving the file, so hand the browser straight to it.
    if (stream.redirectUrl) {
      return NextResponse.redirect(stream.redirectUrl, {
        status: 302,
        headers: { "cache-control": "no-store" },
      });
    }

    if (!stream.body) {
      throw new DownloaderError("upstream_error", undefined, "Download had neither a body nor a redirect");
    }

    const headers = new Headers({
      "content-type": stream.contentType,
      "content-disposition": `attachment; filename="${payload.filename}"; filename*=UTF-8''${encodeURIComponent(
        payload.filename,
      )}`,
      "cache-control": "no-store, no-transform",
      "x-content-type-options": "nosniff",
    });
    if (stream.contentLength) headers.set("content-length", String(stream.contentLength));

    return new Response(stream.body, { status: 200, headers });
  } catch (error) {
    const downloaderError = toDownloaderError(error);
    if (downloaderError.detail) {
      console.error(`[download] ${downloaderError.code}: ${downloaderError.detail}`);
    }
    return NextResponse.json(
      { ok: false, error: { code: downloaderError.code, message: downloaderError.message } },
      { status: downloaderError.status, headers: { "cache-control": "no-store" } },
    );
  }
}
