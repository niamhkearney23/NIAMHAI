import Link from "next/link";
import type { Guide } from "@/lib/guides";
import { ToolBadge } from "@/components/ui/tool-badge";

type Variant = "feature" | "compact" | "note" | "terminal";

function variantFor(index: number): Variant {
  const order: Variant[] = ["feature", "compact", "note", "compact", "terminal", "compact"];
  return order[index % order.length];
}

export function GuideCard({ guide, index }: { guide: Guide; index: number }) {
  const variant = variantFor(index);
  const num = String(index + 1).padStart(2, "0");

  if (variant === "terminal") {
    return (
      <Link
        href={`/guides/${guide.slug}`}
        className="group block overflow-hidden rounded-xl border border-[var(--color-line-dark)] bg-[var(--color-black)] text-[var(--color-cream)] transition-transform duration-200 hover:-translate-y-1"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-line-dark)] px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="text-mono ml-auto text-[11px] uppercase tracking-widest text-[var(--color-cream)]/40">
            guide/{guide.slug}.sh
          </span>
        </div>
        <div className="p-5">
          <p className="text-mono text-xs text-[var(--color-accent)]">$ {guide.category.toLowerCase()} --guide {num}</p>
          <h3 className="text-display mt-3 text-2xl sm:text-3xl">{guide.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-cream)]/70">{guide.outcome}</p>
          <p className="text-mono mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            → run guide
          </p>
        </div>
      </Link>
    );
  }

  if (variant === "note") {
    return (
      <Link
        href={`/guides/${guide.slug}`}
        className="group relative block -rotate-1 rounded-sm border border-[var(--color-line)] bg-[#fff9dd] p-6 shadow-[0_6px_16px_rgba(26,24,20,0.1)] transition-transform duration-200 hover:rotate-0 hover:-translate-y-1"
      >
        <p className="text-mono text-[11px] font-bold uppercase tracking-wide text-[var(--color-ink)]/50">
          tested by niamh — {num}
        </p>
        <h3 className="text-display mt-3 text-2xl">{guide.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/75">{guide.teaser}</p>
        <p className="text-accent-serif mt-4 text-lg text-[var(--color-ink)]/0 transition-colors duration-150 group-hover:text-[var(--color-ink)]/70">
          {guide.outcome}
        </p>
      </Link>
    );
  }

  const isFeature = variant === "feature";

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-7 ${
        isFeature ? "sm:col-span-2" : ""
      }`}
    >
      <div>
        <div className="flex items-center gap-3">
          <span className="text-mono text-sm font-bold text-[var(--color-accent)]">{num}</span>
          <span className="text-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink)]/45">
            {guide.category}
          </span>
        </div>
        <h3 className={`text-display mt-4 ${isFeature ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
          {guide.title}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink)]/75 sm:text-base">
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
        <span className="text-mono text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">
          {guide.stealLine} →
        </span>
      </div>
      <p className="text-mono pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--color-accent)] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-cream)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {guide.outcome}
      </p>
    </Link>
  );
}
