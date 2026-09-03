import { Wordmark } from "@/components/brand/wordmark";

export function Hero() {
  return (
    <section className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Wordmark size="hero" />
        <p className="mt-8 max-w-2xl text-2xl leading-snug sm:text-3xl">
          <span className="text-accent text-[1.15em]">Learn AI</span> the way it
          actually gets used: real prompts, real skills, real workflows — not
          another explainer on what a large language model is.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#guides"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-red)] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[var(--color-cream)] hover:bg-[var(--color-red-dark)]"
          >
            Browse the guides
          </a>
          <a
            href="#about"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink)]/25 px-6 py-3 text-sm font-bold uppercase tracking-wide hover:border-[var(--color-ink)]/50"
          >
            About N1AMH
          </a>
        </div>
      </div>
    </section>
  );
}
