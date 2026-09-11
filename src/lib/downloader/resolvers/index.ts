import { HttpMediaResolver, setDefaultResolver, type MediaResolver } from "../resolver";
import { YtDlpResolver } from "./ytdlp-resolver";

export { YtDlpResolver } from "./ytdlp-resolver";

/**
 * Picks the extraction backend.
 *
 * `SAVEGRAM_RESOLVER` forces a choice. Otherwise an HTTP endpoint wins when one
 * is configured, and yt-dlp is used when it is not, since that is the setup
 * that works without an external service.
 */
export function createResolver(): MediaResolver {
  const configured = (process.env.SAVEGRAM_RESOLVER || "").toLowerCase();

  if (configured === "http") return new HttpMediaResolver();
  if (configured === "ytdlp") return new YtDlpResolver();

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
