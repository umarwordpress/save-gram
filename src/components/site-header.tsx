"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, PlatformIcon } from "@/components/icons";
import type { ToolConfig } from "@/lib/tools/types";

/**
 * Site navigation.
 *
 * Tools live inside one Downloaders menu rather than in the top bar, so the
 * header stays the same size as the registry grows. The tool list is passed in
 * from the server layout, which reads it from the registry.
 */
export function SiteHeader({ tools }: { tools: Array<Pick<ToolConfig, "id" | "name" | "slug" | "icon" | "shortDescription" | "status" | "accentClass">> }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close both menus whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const onToolsSection = pathname.startsWith("/tools");

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            S
          </span>
          SaveGram
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-surface-sunken ${
                onToolsSection ? "text-brand-600" : "text-ink-soft"
              }`}
            >
              Downloaders
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-surface-border bg-white p-2 shadow-[0_20px_50px_-20px_rgba(15,18,34,0.4)]">
                <ul>
                  {tools.map((tool) => (
                    <li key={tool.id}>
                      <ToolMenuLink tool={tool} />
                    </li>
                  ))}
                </ul>
                <div className="mt-1 border-t border-surface-border pt-1">
                  <Link
                    href="/tools"
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                  >
                    View all tools
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/tools"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-surface-sunken ${
              pathname === "/tools" ? "text-brand-600" : "text-ink-soft"
            }`}
          >
            All tools
          </Link>
        </nav>

        {/* Mobile trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border text-ink-soft md:hidden"
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            {mobileOpen ? (
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile navigation: the tool list is always expanded so it is one tap deep. */}
      {mobileOpen && (
        <div id="mobile-navigation" className="border-t border-surface-border bg-white md:hidden">
          <div className="mx-auto max-w-content px-4 py-4 sm:px-6">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Downloaders</p>
            <ul className="space-y-1">
              {tools.map((tool) => (
                <li key={tool.id}>
                  <ToolMenuLink tool={tool} />
                </li>
              ))}
            </ul>
            <Link
              href="/tools"
              className="mt-3 block rounded-xl border border-surface-border px-3 py-3 text-center text-sm font-medium text-brand-600"
            >
              View all tools
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function ToolMenuLink({
  tool,
}: {
  tool: Pick<ToolConfig, "name" | "slug" | "icon" | "shortDescription" | "status" | "accentClass">;
}) {
  const enabled = tool.status === "live";
  const inner = (
    <span className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.accentClass}`} aria-hidden="true">
        <PlatformIcon name={tool.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {tool.name}
          {!enabled && (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              Soon
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{tool.shortDescription}</span>
      </span>
    </span>
  );

  if (!enabled) {
    return <span className="block cursor-default rounded-xl px-3 py-2.5 opacity-70">{inner}</span>;
  }

  return (
    <Link href={`/tools/${tool.slug}`} className="block rounded-xl px-3 py-2.5 transition hover:bg-surface-sunken">
      {inner}
    </Link>
  );
}
