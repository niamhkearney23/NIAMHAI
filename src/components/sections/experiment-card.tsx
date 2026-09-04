import Link from "next/link";
import type { Experiment } from "@/lib/experiments";

const statusColor: Record<Experiment["status"], string> = {
  TESTING: "var(--color-accent)",
  WORKS: "#3f8a5c",
  "CHAOTIC BUT YES": "var(--color-accent)",
  "DIDN'T WORK": "#a83232",
};

export function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const color = statusColor[experiment.status];
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-mono text-xs text-[var(--color-cream)]/50">EXPERIMENT {experiment.id}</span>
        <span
          style={{ color }}
          className="text-mono flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
        >
          <span style={{ background: color }} className="h-1.5 w-1.5 rounded-full" />
          {experiment.status}
        </span>
      </div>
      <h3 className="text-display mt-4 text-2xl sm:text-3xl">{experiment.question}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-cream)]/70">{experiment.note}</p>
      {experiment.guideSlug && (
        <p className="text-mono mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
          → read the guide
        </p>
      )}
    </>
  );

  const className =
    "block rounded-xl border border-[var(--color-line-dark)] bg-[var(--color-charcoal)] p-6 text-[var(--color-cream)] transition-transform duration-200 hover:-translate-y-1 sm:p-7";

  if (experiment.guideSlug) {
    return (
      <Link href={`/guides/${experiment.guideSlug}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
