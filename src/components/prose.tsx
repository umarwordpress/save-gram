/** Shared wrapper for the written pages, so privacy and terms read the same. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 max-w-2xl space-y-6 text-sm leading-relaxed text-ink-soft [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:text-ink-muted [&_p]:text-ink-muted [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      {children}
    </div>
  );
}
