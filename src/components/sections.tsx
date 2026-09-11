import Link from "next/link";
import { ToolGrid } from "@/components/tool-card";
import type { FeatureEntry, HowToStep, ToolConfig, ToolFaq, TroubleshootingEntry, UrlPattern } from "@/lib/tools/types";

/**
 * Content sections shared by every tool page.
 *
 * Each one renders data from a tool config, so the structure is identical
 * across tools while the words stay unique to the platform.
 */

export function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function HowToList({ steps }: { steps: HowToStep[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step.name} className="rounded-2xl border border-surface-border bg-white p-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
            {index + 1}
          </span>
          <h3 className="mt-3 text-sm font-semibold text-ink">{step.name}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function FeatureList({ features }: { features: FeatureEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {features.map((feature) => (
        <li key={feature.title} className="rounded-2xl border border-surface-border bg-white p-5">
          <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function SupportedUrls({ patterns }: { patterns: UrlPattern[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="border-b border-surface-border bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Link type
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Example
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {patterns.map((pattern) => (
            <tr key={pattern.label}>
              <td className="whitespace-nowrap px-5 py-3 font-medium text-ink">{pattern.label}</td>
              <td className="px-5 py-3 font-mono text-xs leading-relaxed text-ink-muted">{pattern.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TroubleshootingList({ entries }: { entries: TroubleshootingEntry[] }) {
  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.problem} className="rounded-2xl border border-surface-border bg-white p-5">
          <h3 className="text-sm font-semibold text-ink">{entry.problem}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{entry.fix}</p>
        </li>
      ))}
    </ul>
  );
}

export function FaqList({ faqs }: { faqs: ToolFaq[] }) {
  return (
    <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
      {faqs.map((faq) => (
        <details key={faq.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink transition hover:bg-surface-sunken">
            {faq.question}
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
          </summary>
          <p className="px-5 pb-4 text-sm leading-relaxed text-ink-muted">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

/** Related tools, generated from the registry and never including the current tool. */
export function RelatedTools({ tools, heading = "More SaveGram tools" }: { tools: ToolConfig[]; heading?: string }) {
  if (tools.length === 0) return null;

  return (
    <Section title={heading} description="Other downloaders that work the same way.">
      <ToolGrid tools={tools} variant="compact" />
      <p className="mt-4 text-sm text-ink-muted">
        <Link href="/tools" className="font-medium text-brand-600 transition hover:text-brand-700">
          Browse all tools
        </Link>
      </p>
    </Section>
  );
}
