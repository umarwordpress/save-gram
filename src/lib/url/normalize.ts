/** Query keys that are tracking noise on every platform we support. */
const TRACKING_KEYS = [
  "igsh",
  "igshid",
  "img_index",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "mibextid",
  "rdid",
  "share_url",
  "_r",
  "_t",
  "is_from_webapp",
  "sender_device",
  "web_id",
  "checksum",
  "si",
  "feature",
  "s",
];

export interface NormalizedUrl {
  /** The cleaned absolute URL. */
  href: string;
  /** Lowercase host with any leading "www." removed. */
  host: string;
  /** Path with a trailing slash removed, except for the root path. */
  path: string;
  /** Query string that survived cleaning, without the leading "?". */
  query: string;
  url: URL;
}

/**
 * Turn user input into a predictable URL.
 *
 * Accepts pasted text with surrounding whitespace, a missing scheme, an
 * uppercase host or the share sheet's tracking parameters. Returns null when the
 * input cannot be parsed as an http(s) URL at all.
 */
export function normalizeUrl(input: string, preserveQueryKeys: string[] = []): NormalizedUrl | null {
  const trimmed = input.trim().replace(/^[<("']+|[>)"']+$/g, "");
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;

  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  url.username = "";
  url.password = "";
  url.port = "";

  const preserve = new Set(preserveQueryKeys.map((key) => key.toLowerCase()));
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (preserve.has(lower)) continue;
    if (TRACKING_KEYS.includes(lower)) url.searchParams.delete(key);
  }
  // Anything not explicitly preserved and not recognized is kept only when the
  // tool asked for it, so unknown params do not leak into resolver requests.
  if (preserve.size > 0) {
    for (const key of [...url.searchParams.keys()]) {
      if (!preserve.has(key.toLowerCase())) url.searchParams.delete(key);
    }
  }

  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";

  return {
    href: url.toString(),
    host,
    path: path === "" ? "/" : path,
    query: url.searchParams.toString(),
    url,
  };
}

/** True when `host` is `base` or a subdomain of it. */
export function hostMatches(host: string, base: string): boolean {
  const normalizedHost = host.replace(/^www\./, "");
  return normalizedHost === base || normalizedHost.endsWith(`.${base}`);
}
