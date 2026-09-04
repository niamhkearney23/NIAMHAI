import Link from "next/link";
import { startHereSteps } from "@/lib/start-here";
import { getGuide } from "@/lib/guides";
import { SectionHeading } from "@/components/ui/section-heading";

export function StartHerePreview() {
  return (
    <section id="start-here" className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          kicker="New here?"
          title="Start"
          accentWord="here."
          description="Five steps, in order, from a blank ChatGPT tab to actually using AI for real work."
        />
        <ol className="mt-10 flex flex-col">
          {startHereSteps.map((step) => {
            const guide = getGuide(step.slug);
            return (
              <li key={step.n} className="border-b border-[var(--color-line)] py-5 last:border-b-0">
                <Link href={`/guides/${step.slug}`} className="group flex items-center gap-5">
                  <span className="text-display text-3xl text-[var(--color-accent)]">
                    {String(step.n).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="text-display block text-xl sm:text-2xl">{step.title}</span>
                    {guide && (
                      <span className="text-mono mt-1 block text-xs uppercase tracking-wide text-[var(--color-ink)]/45">
                        {guide.time}
                        {guide.setupTime ? ` · ${guide.setupTime}` : ""}
                      </span>
                    )}
                  </span>
                  <span className="text-mono text-[var(--color-accent)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
