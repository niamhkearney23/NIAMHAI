import { stack } from "@/lib/stack";
import { SectionHeading } from "@/components/ui/section-heading";

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-mono text-xs text-[var(--color-accent)]">N/A</span>;
  return (
    <span aria-hidden className="text-[var(--color-accent)]">
      {"★".repeat(rating)}
      <span className="text-[var(--color-ink)]/20">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function AIStack() {
  return (
    <section className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          kicker="No affiliate links, just what's on my machine"
          title="Things I'm actually"
          accentWord="using."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stack.map((item) => (
            <div
              key={item.name}
              className="group relative overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-display text-xl">{item.name}</p>
                <Stars rating={item.rating} />
              </div>
              <p className="text-mono mt-2 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/60">
                {item.usage}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/70">{item.comment}</p>
              <div className="pointer-events-none absolute inset-0 flex items-end bg-[var(--color-black)]/90 p-5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <p className="text-mono text-sm text-[var(--color-accent)]">→ {item.hover}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
