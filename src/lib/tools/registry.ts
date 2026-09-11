import type { ToolCategory, ToolCategoryId, ToolConfig, ToolStatus } from "./types";
import { instagramReelDownloader } from "./definitions/instagram-reel-downloader";
import { tiktokVideoDownloader } from "./definitions/tiktok-video-downloader";
import { facebookReelDownloader } from "./definitions/facebook-reel-downloader";

/**
 * The registry.
 *
 * To add a tool: write a definition file, import it, add it to this array, then
 * register a provider with a matching `provider` id. Cards, navigation, routes,
 * breadcrumbs, related links, the sitemap and page metadata follow from here.
 */
const TOOLS: ToolConfig[] = [
  instagramReelDownloader,
  tiktokVideoDownloader,
  facebookReelDownloader,
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "social-media-downloaders",
    name: "Social Media Downloaders",
    description: "Save public videos from the platforms people share them on.",
    order: 1,
  },
];

/** Statuses whose pages exist and can be opened. */
const ROUTABLE: ToolStatus[] = ["live", "coming-soon", "retired"];
/** Statuses that appear in listings, navigation and the sitemap. */
const LISTABLE: ToolStatus[] = ["live", "coming-soon"];

function byOrder(a: ToolConfig, b: ToolConfig): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/** Every tool in the registry regardless of status. Rarely what you want. */
export function getAllTools(): ToolConfig[] {
  return [...TOOLS].sort(byOrder);
}

/** Tools that are finished and accepting input. */
export function getLiveTools(): ToolConfig[] {
  return getAllTools().filter((tool) => tool.status === "live");
}

/** Tools shown in listings: live ones plus anything marked coming soon. */
export function getListedTools(): ToolConfig[] {
  return getAllTools().filter((tool) => LISTABLE.includes(tool.status));
}

/** Tools whose /tools/<slug> page should render rather than 404. */
export function getRoutableTools(): ToolConfig[] {
  return getAllTools().filter((tool) => ROUTABLE.includes(tool.status));
}

/** Only live tools belong in the sitemap and in search results. */
export function getIndexableTools(): ToolConfig[] {
  return getLiveTools();
}

export function getToolBySlug(slug: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export function getToolById(id: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

export function getToolByPlatform(platform: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.platform === platform);
}

/** The derived `enabled` flag: true when the tool will accept a link. */
export function isToolEnabled(tool: ToolConfig): boolean {
  return tool.status === "live";
}

export function isToolIndexable(tool: ToolConfig): boolean {
  return tool.status === "live";
}

export function isToolListed(tool: ToolConfig): boolean {
  return LISTABLE.includes(tool.status);
}

/** Listed tools grouped by category, with empty categories dropped. */
export function getToolsByCategory(): Array<{ category: ToolCategory; tools: ToolConfig[] }> {
  return [...TOOL_CATEGORIES]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      tools: getListedTools().filter((tool) => tool.category === category.id),
    }))
    .filter((group) => group.tools.length > 0);
}

export function getCategory(id: ToolCategoryId): ToolCategory | undefined {
  return TOOL_CATEGORIES.find((category) => category.id === id);
}

/**
 * Related tools for a tool page. Never includes the current tool, and never
 * includes anything that is not live, since a related link should always lead
 * somewhere usable.
 */
export function getRelatedTools(currentSlug: string, limit = 3): ToolConfig[] {
  const current = getToolBySlug(currentSlug);
  const pool = getLiveTools().filter((tool) => tool.slug !== currentSlug);
  if (!current) return pool.slice(0, limit);

  // Same category first, then everything else, each already in registry order.
  const sameCategory = pool.filter((tool) => tool.category === current.category);
  const others = pool.filter((tool) => tool.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}

/** Tools listed in the Downloaders navigation menu. */
export function getNavTools(): ToolConfig[] {
  return getListedTools();
}
