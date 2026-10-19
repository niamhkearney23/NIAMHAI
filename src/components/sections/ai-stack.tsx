import { stack } from "@/lib/stack";
import { SectionHeading } from "@/components/ui/section-heading";

function Stars({ rating }: { rating: number | null }) {
  if (rating === null)
    return <span className="text-xs font-medium text-[var(--color-muted)]">N/A</span>;
  return (
    <span aria-hidden className="text-[var(--color-accent)]">
      {"★".repeat(rating)}
      <span className="text-[var(--color-border)]">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function AIStack() {
  return (
    <section className="border-b border-[var(--color-border)] px-5 py-16 sm:px-8 sm:py-24">
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
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold tracking-tight">{item.name}</p>
                <Stars rating={item.rating} />
              </div>
              <p className="mt-1 text-xs font-medium text-[var(--color-muted)]">{item.usage}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                {item.comment}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
