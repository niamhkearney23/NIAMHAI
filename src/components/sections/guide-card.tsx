import Link from "next/link";
import type { Guide } from "@/lib/guides";
import { ToolBadge } from "@/components/ui/tool-badge";

export function GuideCard({ guide, index }: { guide: Guide; index: number }) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex flex-col justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-7"
    >
      <div>
        <div className="flex items-center gap-3">
          <span className="text-mono text-sm font-bold text-[var(--color-accent)]">{num}</span>
          <span className="text-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink)]/45">
            {guide.category}
          </span>
        </div>
        <h3 className="text-display mt-4 text-2xl sm:text-3xl">{guide.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/75 sm:text-base">
          {guide.teaser}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {guide.tools.map((tool) => (
            <ToolBadge key={tool} tool={tool} />
          ))}
          <ToolBadge tool={guide.time} />
        </div>
        <span className="text-mono text-xs font-bold uppercase tracking-wide text-[var(--color-accent)] group-hover:underline">
          Read guide →
        </span>
      </div>
    </Link>
  );
}
