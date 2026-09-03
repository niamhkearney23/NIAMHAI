import { guides } from "@/lib/guides";
import { GuideCard } from "@/components/sections/guide-card";

export function GuidesGrid() {
  return (
    <section id="guides" className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-display text-5xl sm:text-7xl">
          Recent <span className="text-accent text-[1.1em] normal-case">free</span>{" "}
          guides
        </h2>
        <p className="mt-4 max-w-xl text-base text-[var(--color-ink)]/70 sm:text-lg">
          Bite-sized guides to help you get more out of AI, from setup to
          workflows you&apos;ll actually keep using. Grab whatever looks fun.
        </p>
        <div className="mt-10">
          {guides.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </div>
    </section>
  );
}
