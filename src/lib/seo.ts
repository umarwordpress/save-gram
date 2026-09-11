import type { Metadata } from "next";
import type { ToolConfig } from "@/lib/tools/types";
import { isToolIndexable } from "@/lib/tools/registry";
import { absoluteUrl, siteConfig } from "./site";

export interface Crumb {
  name: string;
  href: string;
}

/** Page metadata built from a tool config, so every tool page differs. */
export function buildToolMetadata(tool: ToolConfig): Metadata {
  const canonical = absoluteUrl(`/tools/${tool.slug}`);
  const indexable = isToolIndexable(tool);

  return {
    // `absolute` opts out of the root layout's "%s | SaveGram" template, since
    // seoTitle is already the complete title tag for the page.
    title: { absolute: tool.seoTitle },
    description: tool.seoDescription,
    keywords: tool.keywords,
    alternates: { canonical },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title: tool.seoTitle,
      description: tool.seoDescription,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: tool.seoTitle,
      description: tool.seoDescription,
    },
  };
}

export function buildPageMetadata(options: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  index?: boolean;
}): Metadata {
  const canonical = absoluteUrl(options.path);
  return {
    title: options.title,
    description: options.description,
    keywords: options.keywords,
    alternates: { canonical },
    robots: options.index === false ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      url: canonical,
      title: options.title,
      description: options.description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
    },
  };
}

/* Structured data. Each builder returns a plain object for a JSON-LD script. */

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.href),
    })),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function howToSchema(tool: ToolConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to use the ${tool.name}`,
    description: tool.seoDescription,
    totalTime: "PT1M",
    step: tool.howTo.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: `${absoluteUrl(`/tools/${tool.slug}`)}#how-to`,
    })),
  };
}

export function toolAppSchema(tool: ToolConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    url: absoluteUrl(`/tools/${tool.slug}`),
    description: tool.seoDescription,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function itemListSchema(items: Array<{ name: string; href: string; description: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: absoluteUrl(item.href),
    })),
  };
}
