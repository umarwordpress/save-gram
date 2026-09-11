export const siteConfig = {
  name: "SaveGram",
  /** Used for canonical URLs, the sitemap and Open Graph tags. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://savegram.app").replace(/\/$/, ""),
  tagline: "Download tools for public social media video.",
  description:
    "SaveGram is a small set of tools for saving publicly posted videos from social platforms. Paste a link, get the file, no account needed.",
  locale: "en_US",
  twitter: "@savegram",
} as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Static pages that are not generated from the tool registry. */
export const staticRoutes = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/tools", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
];

export const footerLinks = [
  { label: "All tools", href: "/tools" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];
