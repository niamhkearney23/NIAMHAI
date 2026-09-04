import Link from "next/link";
import { experiments } from "@/lib/experiments";
import { ExperimentCard } from "@/components/sections/experiment-card";
import { SectionHeading } from "@/components/ui/section-heading";

export function LabPreview() {
  return (
    <section id="lab" className="bg-[var(--color-black)] px-5 py-16 text-[var(--color-cream)] sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            kicker="Things I'm testing so you don't have to"
            title="N1AMH"
            accentWord="lab."
            tone="dark"
          />
          <Link href="/lab" className="text-mono text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">
            All experiments →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {experiments.slice(0, 4).map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      </div>
    </section>
  );
}
