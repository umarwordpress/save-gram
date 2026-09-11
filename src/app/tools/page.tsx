import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ToolGrid } from "@/components/tool-card";
import { getListedTools, getToolsByCategory } from "@/lib/tools/registry";
import { breadcrumbSchema, buildPageMetadata, itemListSchema } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "All Tools",
  description:
    "Every SaveGram downloader in one place, grouped by what it does. Currently covering Instagram Reels, TikTok videos and Facebook Reels.",
  path: "/tools",
  keywords: ["savegram tools", "video downloader tools", "social media downloaders"],
});

const CRUMBS = [
  { name: "Home", href: "/" },
  { name: "Tools", href: "/tools" },
];

export default function ToolsPage() {
  const groups = getToolsByCategory();
  const listed = getListedTools();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(CRUMBS),
          itemListSchema(
            listed.map((tool) => ({
              name: tool.name,
              href: `/tools/${tool.slug}`,
              description: tool.shortDescription,
            })),
          ),
        ]}
      />

      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs crumbs={CRUMBS} />

        <header className="mt-6 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">SaveGram tools</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            Every tool that is ready to use, grouped by category. Tools appear here once they work properly, so this list
            is short on purpose.
          </p>
        </header>

        <div className="mt-10 space-y-12">
          {groups.map((group) => (
            <section key={group.category.id}>
              <h2 className="text-xl font-semibold tracking-tight text-ink">{group.category.name}</h2>
              <p className="mt-1.5 text-sm text-ink-muted">{group.category.description}</p>
              <div className="mt-5">
                <ToolGrid tools={group.tools} />
              </div>
            </section>
          ))}

          {groups.length === 0 && (
            <p className="rounded-2xl border border-surface-border bg-surface-sunken p-6 text-sm text-ink-muted">
              No tools are available right now. Check back soon.
            </p>
          )}
        </div>

        <section className="mt-16 rounded-2xl border border-surface-border bg-surface-sunken p-6">
          <h2 className="text-base font-semibold text-ink">More tools are on the way</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            New downloaders are added when they can be supported properly. A tool shows up on this page once it is
            finished, and anything still being built is either hidden or marked as coming soon rather than listed as if
            it works.
          </p>
        </section>
      </div>
    </>
  );
}
