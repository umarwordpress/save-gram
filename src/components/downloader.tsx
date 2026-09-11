"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertIcon, DownloadIcon, SpinnerIcon } from "@/components/icons";
import { quickValidate, type ClientTool } from "@/lib/tools/client";

/**
 * The downloader interface.
 *
 * One component serves every tool. It takes a client safe tool description and
 * knows nothing about any specific platform, so a new tool reuses it as is.
 */

interface ResolvedAsset {
  id: string;
  label: string;
  kind: "video" | "image" | "audio";
  extension: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  filename: string;
  downloadUrl: string;
}

interface ResolveResponse {
  ok: boolean;
  metadata?: {
    title: string | null;
    author: string | null;
    authorHandle: string | null;
    thumbnailUrl: string | null;
    durationSeconds: number | null;
    sourceUrl: string;
  };
  assets?: ResolvedAsset[];
  error?: { code: string; message: string };
}

type Status = "idle" | "loading" | "ready" | "error";

export function Downloader({ tool }: { tool: ClientTool }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!tool.enabled) return;

      const precheck = quickValidate(value, tool);
      if (!precheck.ok) {
        setStatus("error");
        setError(precheck.message ?? "That link cannot be used here.");
        setResult(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: value.trim(), tool: tool.slug }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as ResolveResponse;

        if (!response.ok || !payload.ok) {
          setStatus("error");
          setError(payload.error?.message ?? "That link could not be resolved. Try again shortly.");
          return;
        }

        setResult(payload);
        setStatus("ready");
      } catch (caught) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError("The request could not be completed. Check your connection and try again.");
      }
    },
    [tool, value],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setValue("");
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text);
        setStatus("idle");
        setError(null);
      }
    } catch {
      // Clipboard access is denied in some browsers. Typing still works.
    }
  }, []);

  const disabled = !tool.enabled || status === "loading";

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,18,34,0.5)] sm:p-6">
      <form onSubmit={submit} noValidate>
        <label htmlFor="downloader-url" className="block text-sm font-medium text-ink">
          Paste the link
        </label>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              id="downloader-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={value}
              disabled={!tool.enabled}
              placeholder={tool.placeholder}
              onChange={(event) => {
                setValue(event.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setError(null);
                }
              }}
              aria-invalid={status === "error"}
              aria-describedby={error ? "downloader-error" : undefined}
              className="w-full rounded-xl border border-surface-border bg-surface-sunken px-4 py-3 pr-20 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={value ? reset : pasteFromClipboard}
              disabled={!tool.enabled}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-surface-sunken hover:text-ink disabled:opacity-60"
            >
              {value ? "Clear" : "Paste"}
            </button>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Working
              </>
            ) : (
              "Get video"
            )}
          </button>
        </div>

        {!tool.enabled && (
          <p className="mt-3 text-sm text-ink-muted">This tool is not accepting links yet.</p>
        )}
      </form>

      <div aria-live="polite">
        {status === "error" && error && (
          <div
            id="downloader-error"
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p>{error}</p>
          </div>
        )}

        {status === "loading" && (
          <div className="mt-4 animate-pulse rounded-xl border border-surface-border bg-surface-sunken p-4">
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 rounded-lg bg-surface-border" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 rounded bg-surface-border" />
                <div className="h-3 w-1/3 rounded bg-surface-border" />
              </div>
            </div>
          </div>
        )}

        {status === "ready" && result?.assets && <ResultPanel result={result} onReset={reset} />}
      </div>
    </div>
  );
}

function ResultPanel({ result, onReset }: { result: ResolveResponse; onReset: () => void }) {
  const assets = result.assets ?? [];
  const metadata = result.metadata;

  const byline = useMemo(() => {
    if (!metadata) return null;
    return metadata.authorHandle || metadata.author || null;
  }, [metadata]);

  return (
    <div className="mt-5 rounded-xl border border-surface-border bg-surface-sunken p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        {metadata?.thumbnailUrl ? (
          // Thumbnails come from platform CDNs and are not resized here, so a
          // plain img keeps the build free of remote image configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={metadata.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-32 w-24 shrink-0 rounded-lg border border-surface-border object-cover sm:h-28 sm:w-20"
          />
        ) : (
          <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted sm:h-28 sm:w-20">
            <DownloadIcon className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {metadata?.title && (
            <p className="line-clamp-2 text-sm font-medium text-ink">{metadata.title}</p>
          )}
          {byline && <p className="mt-1 text-sm text-ink-muted">{byline}</p>}
          {metadata?.durationSeconds ? (
            <p className="mt-1 text-xs text-ink-muted">{formatDuration(metadata.durationSeconds)}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {assets.map((asset) => (
              <a
                key={asset.id}
                href={asset.downloadUrl}
                download={asset.filename}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <DownloadIcon className="h-4 w-4" />
                {asset.label}
                {asset.sizeBytes ? (
                  <span className="text-xs font-normal opacity-80">{formatBytes(asset.sizeBytes)}</span>
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-xs text-ink-muted">
        <p>Download links stay valid for a short time. Resolve again if one stops working.</p>
        <button type="button" onClick={onReset} className="font-medium text-brand-600 transition hover:text-brand-700">
          New link
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
