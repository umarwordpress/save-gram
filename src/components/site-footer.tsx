import Link from "next/link";
import { getListedTools } from "@/lib/tools/registry";
import { footerLinks, siteConfig } from "@/lib/site";

/** Footer tool links come from the registry, so they stay in step with it. */
export function SiteFooter() {
  const tools = getListedTools();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-surface-border bg-surface-sunken">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                S
              </span>
              SaveGram
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              A growing set of tools for saving publicly posted social media video. Paste a link, get the file.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink">Downloaders</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {tools.map((tool) => (
                <li key={tool.id}>
                  {tool.status === "live" ? (
                    <Link href={`/tools/${tool.slug}`} className="text-ink-muted transition hover:text-brand-600">
                      {tool.name}
                    </Link>
                  ) : (
                    <span className="text-ink-muted opacity-70">{tool.name} (soon)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink">Site</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-muted transition hover:text-brand-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-surface-border pt-6 text-xs leading-relaxed text-ink-muted">
          <p>
            &copy; {year} {siteConfig.name}. Not affiliated with Instagram, TikTok, Facebook or Meta. All trademarks
            belong to their owners.
          </p>
          <p className="mt-2">
            SaveGram works with publicly available content only. Respect the rights of the people who made what you save.
          </p>
        </div>
      </div>
    </footer>
  );
}
