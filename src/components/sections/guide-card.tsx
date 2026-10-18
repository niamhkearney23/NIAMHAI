import Link from "next/link";
import type { Guide } from "@/lib/guides";
import { ToolBadge } from "@/components/ui/tool-badge";

export function GuideCard({ guide }: { guide: Guide; index: number }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex flex-col justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-shadow hover:shadow-md"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {guide.category}
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight">{guide.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{guide.teaser}</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {guide.tools.map((tool) => (
            <ToolBadge key={tool} tool={tool} />
          ))}
          <ToolBadge tool={guide.time} />
        </div>
        <span className="text-sm font-medium text-[var(--color-accent)] group-hover:underline">
          Read guide →
        </span>
      </div>
    </Link>
  );
}
