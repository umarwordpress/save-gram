import { HttpMediaResolver, setDefaultResolver, type MediaResolver } from "../resolver";
import { YtDlpResolver } from "./ytdlp-resolver";
import { RemoteYtDlpResolver } from "./remote-ytdlp-resolver";

export { YtDlpResolver } from "./ytdlp-resolver";
export { RemoteYtDlpResolver } from "./remote-ytdlp-resolver";

/**
 * Picks the extraction backend.
 *
 * `SAVEGRAM_RESOLVER` forces a choice. Otherwise the extraction service wins
 * when one is configured, then a generic HTTP endpoint, and yt-dlp on this
 * machine is the fallback.
 *
 * - `remote` calls the service in services/extractor. Use this on a host that
 *   cannot run a binary, such as Vercel functions.
 * - `ytdlp` runs the binary here. Needs a server that allows subprocesses.
 * - `http` calls any service that speaks the ResolverResult contract.
 */
export function createResolver(): MediaResolver {
  const configured = (process.env.SAVEGRAM_RESOLVER || "").toLowerCase();

  if (configured === "remote") return new RemoteYtDlpResolver();
  if (configured === "http") return new HttpMediaResolver();
  if (configured === "ytdlp") return new YtDlpResolver();

  if (process.env.SAVEGRAM_EXTRACTOR_URL) return new RemoteYtDlpResolver();
  if (process.env.SAVEGRAM_RESOLVER_ENDPOINT) return new HttpMediaResolver();
  return new YtDlpResolver();
}

let installed = false;

/** Installs the chosen resolver once per process. */
export function installDefaultResolver(): void {
  if (installed) return;
  installed = true;
  setDefaultResolver(createResolver());
}
