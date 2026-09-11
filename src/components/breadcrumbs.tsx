import Link from "next/link";
import type { Crumb } from "@/lib/seo";

/** Visible trail. The matching JSON-LD is emitted separately by the page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-ink-soft">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.href} className="transition hover:text-brand-600">
                  {crumb.name}
                </Link>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
