/**
 * Tool registry types.
 *
 * Every SaveGram tool is described by one ToolConfig object. Pages, cards,
 * navigation, breadcrumbs, sitemap entries, internal links and SEO metadata are
 * all generated from these objects, so adding a tool means adding a config and a
 * provider rather than editing the UI.
 */

/**
 * Lifecycle of a tool.
 *
 * `status` is the single source of truth for whether a tool is usable. The spec
 * also mentions an `enabled` flag; keeping two independent fields lets them
 * disagree (enabled: true with status: "coming-soon"), so `enabled` is exposed
 * as a derived value through the registry helpers instead.
 *
 * - `live`        listed everywhere, routable, indexable, accepts input.
 * - `coming-soon` listed with a badge, routable, not indexable, input disabled.
 * - `hidden`      not listed, not routable, not indexed. Use while building.
 * - `retired`     kept for its URL, shown as unavailable, not indexed.
 */
export type ToolStatus = "live" | "coming-soon" | "hidden" | "retired";

/** Groups tools on /tools and in the homepage picker. */
export type ToolCategoryId = "social-media-downloaders";

export interface ToolCategory {
  id: ToolCategoryId;
  /** Heading shown above the group. */
  name: string;
  /** One line under the heading. */
  description: string;
  /** Lower numbers sort first. */
  order: number;
}

/** Keys into the icon component map in src/components/icons. */
export type IconKey = "instagram" | "tiktok" | "facebook" | "youtube" | "twitter" | "generic";

export interface UrlPattern {
  /** Human readable label, shown in the "Supported links" table. */
  label: string;
  /** Example link shown next to the label. */
  example: string;
  /** Tested against the normalized URL path (and query where relevant). */
  test: RegExp;
  /**
   * Hosts this pattern applies to, without a leading "www.". Omit to allow any
   * of the tool's hosts. Needed for short link patterns, which are broad enough
   * to match an ordinary profile path on the main domain.
   */
  hosts?: string[];
}

export interface ValidationRules {
  /** Hostnames accepted for this tool, lowercase, without a leading "www.". */
  hostnames: string[];
  /** At least one pattern must match for the link to be accepted. */
  patterns: UrlPattern[];
  /** Shown when the host is right but no pattern matched. */
  patternHint: string;
  /** Placeholder text for the input field. */
  placeholder: string;
  /** Query keys worth keeping when normalizing (everything else is dropped). */
  preserveQueryKeys?: string[];
}

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface TroubleshootingEntry {
  problem: string;
  fix: string;
}

export interface FeatureEntry {
  title: string;
  body: string;
}

export interface ToolConfig {
  /** Stable internal id. Never change it once a tool has shipped. */
  id: string;
  /** Display name, used for H1, cards, nav and breadcrumbs. */
  name: string;
  /** URL segment under /tools. Never change it once a tool has shipped. */
  slug: string;
  /** Platform key, also used to pick the provider and the icon. */
  platform: string;
  /** Platform name as people write it, for use in sentences. */
  platformName: string;
  /** One sentence for cards and related-tool links. */
  shortDescription: string;
  /** Two or three sentences for the tools directory and card hover text. */
  description: string;
  /** Opening paragraphs on the tool page. Unique per tool. */
  intro: string[];
  icon: IconKey;
  category: ToolCategoryId;
  status: ToolStatus;
  /** Tailwind classes for the platform accent, applied to icon chips. */
  accentClass: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  /** Id of the provider that handles this tool's links. */
  provider: string;
  validation: ValidationRules;
  howTo: HowToStep[];
  features: FeatureEntry[];
  faqs: ToolFaq[];
  troubleshooting: TroubleshootingEntry[];
  /** Sort order within the category. Lower first. */
  order: number;
}
