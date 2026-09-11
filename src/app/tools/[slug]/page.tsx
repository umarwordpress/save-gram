import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Downloader } from "@/components/downloader";
import { JsonLd } from "@/components/json-ld";
import {
  FaqList,
  FeatureList,
  HowToList,
  RelatedTools,
  Section,
  SupportedUrls,
  TroubleshootingList,
} from "@/components/sections";
import {
  getRelatedTools,
  getRoutableTools,
  getToolBySlug,
  isToolEnabled,
  isToolIndexable,
} from "@/lib/tools/registry";
import { toClientTool } from "@/lib/tools/client";
import { PlatformIcon } from "@/components/icons";
import {
  breadcrumbSchema,
  buildToolMetadata,
  faqSchema,
  howToSchema,
  toolAppSchema,
} from "@/lib/seo";

/**
 * The tool page template.
 *
 * Every downloader renders through this one route. The structure is fixed
 * (breadcrumb, H1, intro, interface, how to, features, supported links,
 * troubleshooting, FAQ, related tools) while all of the words come from the
 * tool's own config, so no page is a copy of another with the name swapped.
 */

interface PageProps {
  params: { slug: string };
}

/** Only tools that exist get a page. No thin pages are generated. */
export function generateStaticParams() {
  return getRoutableTools().map((tool) => ({ slug: tool.slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: PageProps): Metadata {
  const tool = getToolBySlug(params.slug);
  if (!tool) return {};
  return buildToolMetadata(tool);
}

export default function ToolPage({ params }: PageProps) {
  const tool = getToolBySlug(params.slug);
  if (!tool || !getRoutableTools().some((candidate) => candidate.slug === tool.slug)) {
    notFound();
  }

  const related = getRelatedTools(tool.slug);
  const enabled = isToolEnabled(tool);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Tools", href: "/tools" },
    { name: tool.name, href: `/tools/${tool.slug}` },
  ];

  const schemas: Record<string, unknown>[] = [breadcrumbSchema(crumbs), faqSchema(tool.faqs)];
  // Structured data is only claimed for a tool that actually works.
  if (isToolIndexable(tool)) {
    schemas.push(howToSchema(tool), toolAppSchema(tool));
  }

  return (
    <>
      <JsonLd data={schemas} />

      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs crumbs={crumbs} />

        <header className="mt-6 max-w-2xl">
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tool.accentClass}`}
            aria-hidden="true"
          >
            <PlatformIcon name={tool.icon} className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{tool.name}</h1>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-soft">
            {tool.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          {!enabled && (
            <p className="mt-4 rounded-xl border border-surface-border bg-surface-sunken p-4 text-sm text-ink-muted">
              This tool is still being built. The page is here so you can see what it will cover, but it does not accept
              links yet.
            </p>
          )}
        </header>

        <div className="mt-8">
          <Downloader tool={toClientTool(tool)} />
        </div>

        <div className="mt-16 space-y-14">
          <Section
            id="how-to"
            title={`How to use the ${tool.name}`}
            description="Four steps from the app to a saved file."
          >
            <HowToList steps={tool.howTo} />
          </Section>

          <Section title="Key features">
            <FeatureList features={tool.features} />
          </Section>

          <Section
            id="supported-links"
            title="Supported links"
            description={`Link formats the ${tool.name} recognizes.`}
          >
            <SupportedUrls patterns={tool.validation.patterns} />
          </Section>

          <Section
            id="troubleshooting"
            title="Troubleshooting"
            description="What usually goes wrong, and what to do about it."
          >
            <TroubleshootingList entries={tool.troubleshooting} />
          </Section>

          <Section id="faq" title="Frequently asked questions">
            <FaqList faqs={tool.faqs} />
          </Section>

          <RelatedTools tools={related} />
        </div>
      </div>
    </>
  );
}
