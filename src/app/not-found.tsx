import Link from "next/link";
import { ToolGrid } from "@/components/tool-card";
import { getLiveTools } from "@/lib/tools/registry";

export default function NotFound() {
  const tools = getLiveTools();

  return (
    <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">This page does not exist</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
        The address may be mistyped, or the tool you are looking for may not have been built yet. Here is what is
        available right now.
      </p>

      <div className="mt-10">
        <ToolGrid tools={tools} variant="compact" />
      </div>

      <p className="mt-8 text-sm">
        <Link href="/tools" className="font-medium text-brand-600 transition hover:text-brand-700">
          Browse all tools
        </Link>
      </p>
    </div>
  );
}
