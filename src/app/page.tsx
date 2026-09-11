import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ToolGrid } from "@/components/tool-card";
import { FaqList, Section } from "@/components/sections";
import { getListedTools, getToolsByCategory } from "@/lib/tools/registry";
import { buildPageMetadata, faqSchema, itemListSchema } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: `${siteConfig.name}: Save Public Social Media Video`,
  description:
    "Paste a link from Instagram, TikTok or Facebook and download the video. SaveGram is a set of simple download tools that work in the browser without an account.",
  path: "/",
  keywords: ["social media video downloader", "instagram reel downloader", "tiktok downloader", "facebook reel downloader"],
});

const HOME_FAQS = [
  {
    question: "Do I need an account to use SaveGram?",
    answer:
      "No. There is no sign up, no login and no app to install. Open a tool, paste a link and download the file.",
  },
  {
    question: "Is SaveGram free?",
    answer:
      "Yes, the tools are free to use. Rate limits apply so one visitor cannot take the service down for everyone else.",
  },
  {
    question: "Can I download private posts?",
    answer:
      "No. Every tool reads publicly available content only. Private accounts, restricted audiences and anything behind a login stay out of reach, and SaveGram never asks for your platform credentials.",
  },
  {
    question: "Are my downloads stored anywhere?",
    answer:
      "The file is streamed through the request that serves it to you. Nothing is written to disk and nothing is kept once the response finishes.",
  },
  {
    question: "Can I repost what I download?",
    answer:
      "That depends on the rights to the content, which belong to whoever made it. Saving a public video for personal use is one thing, republishing it as your own is another. Ask the creator first.",
  },
  {
    question: "Which platforms will be added next?",
    answer:
      "New downloaders are added when they can be supported properly rather than announced early. Anything that is ready appears in the tools directory.",
  },
];

export default function HomePage() {
  const groups = getToolsByCategory();
  const listed = getListedTools();

  return (
    <>
      <JsonLd
        data={[
          faqSchema(HOME_FAQS),
          itemListSchema(
            listed.map((tool) => ({
              name: tool.name,
              href: `/tools/${tool.slug}`,
              description: tool.shortDescription,
            })),
          ),
        ]}
      />

      {/* Hero */}
      <div className="border-b border-surface-border bg-gradient-to-b from-brand-50/60 to-white">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand-600">{listed.length} tools available</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Save public social media video
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Paste a link, get the file. SaveGram is a small collection of download tools for videos that are already
              public, with no account step and nothing to install.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#choose-a-downloader"
                className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Choose a downloader
              </Link>
              <Link
                href="/tools"
                className="rounded-xl border border-surface-border bg-white px-6 py-3 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
              >
                See all tools
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-content space-y-16 px-4 py-16 sm:px-6">
        {/* Tool picker, generated from the registry. */}
        <section id="choose-a-downloader" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Choose a downloader</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Each tool is built around one platform, because the link formats and the quirks are different on each of them.
          </p>

          <div className="mt-6 space-y-10">
            {groups.map((group) => (
              <div key={group.category.id}>
                {groups.length > 1 && (
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                    {group.category.name}
                  </h3>
                )}
                <ToolGrid tools={group.tools} variant="compact" />
              </div>
            ))}
          </div>
        </section>

        <Section
          title="How it works"
          description="The same three steps on every tool."
        >
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Copy the link",
                body: "Use the share option in the app, or copy the address from your browser. Tracking parameters are removed for you.",
              },
              {
                title: "Paste it in",
                body: "The tool checks that the link is one it can handle and tells you plainly when it is not.",
              },
              {
                title: "Download the file",
                body: "Pick a quality where more than one is offered, then save the file to your device.",
              },
            ].map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-surface-border bg-white p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="What SaveGram does and does not do"
          description="Worth knowing before you paste a link."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h3 className="text-sm font-semibold text-ink">It does</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-muted">
                <li>Resolve videos from links that anyone can open.</li>
                <li>Hand back the file the platform serves, without re-encoding it.</li>
                <li>Strip tracking parameters from the links you paste.</li>
                <li>Explain in plain terms when a link cannot be used.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h3 className="text-sm font-semibold text-ink">It does not</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-muted">
                <li>Ask for your platform password or log in on your behalf.</li>
                <li>Reach private accounts, stories or restricted posts.</li>
                <li>Keep copies of the media it serves you.</li>
                <li>Grant you any rights over someone else&apos;s work.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="faq" title="Common questions">
          <FaqList faqs={HOME_FAQS} />
        </Section>
      </div>
    </>
  );
}
