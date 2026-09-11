import type { MetadataRoute } from "next";
import { getIndexableTools } from "@/lib/tools/registry";
import { absoluteUrl, staticRoutes } from "@/lib/site";

/**
 * Sitemap.
 *
 * Tool entries come from the registry, and only live tools are included, so a
 * tool that is hidden or still being built never reaches search engines.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = staticRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const tools = getIndexableTools().map((tool) => ({
    url: absoluteUrl(`/tools/${tool.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...pages, ...tools];
}
