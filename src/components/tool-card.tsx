import Link from "next/link";
import { ArrowRightIcon, PlatformIcon } from "@/components/icons";
import { isToolEnabled } from "@/lib/tools/registry";
import type { ToolConfig } from "@/lib/tools/types";

/**
 * One card per tool, driven entirely by the registry.
 *
 * Used on the homepage, the tools directory and the related tools section, so a
 * new tool picks up the same treatment without any new markup.
 */
export function ToolCard({ tool, variant = "full" }: { tool: ToolConfig; variant?: "full" | "compact" }) {
  const enabled = isToolEnabled(tool);
  const href = `/tools/${tool.slug}`;

  const content = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.accentClass}`}
          aria-hidden="true"
        >
          <PlatformIcon name={tool.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{tool.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {variant === "compact" ? tool.shortDescription : tool.description}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        {enabled ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600">
            Open tool
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="text-sm font-medium text-ink-muted">In progress</span>
        )}
        {!enabled && (
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-muted">
            Coming soon
          </span>
        )}
      </div>
    </>
  );

  const className =
    "group flex flex-col rounded-2xl border border-surface-border bg-white p-5 transition hover:border-brand-300 hover:shadow-[0_12px_30px_-18px_rgba(15,18,34,0.35)]";

  if (!enabled) {
    return (
      <div className={`${className} opacity-80`} aria-label={`${tool.name}, coming soon`}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

/** Grid wrapper so every listing of tools lines up the same way. */
export function ToolGrid({ tools, variant = "full" }: { tools: ToolConfig[]; variant?: "full" | "compact" }) {
  if (tools.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} variant={variant} />
      ))}
    </div>
  );
}
