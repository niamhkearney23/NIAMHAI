import { Wordmark } from "@/components/brand/wordmark";

export function Hero() {
  return (
    <section className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-accent-serif text-2xl sm:text-3xl">hey, it&apos;s Niamh —</p>
        <div className="mt-2">
          <Wordmark size="hero" />
        </div>
        <p className="mt-8 max-w-xl text-2xl leading-snug sm:text-3xl">
          <span className="text-accent-serif text-[1.15em]">Let&apos;s make AI</span> actually
          useful: real prompts, real workflows, no fluff.
        </p>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-ink)]/70">
          I spend an unreasonable amount of time testing AI so you don&apos;t have to.
        </p>
        <a
          href="#guides"
          className="text-mono mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[var(--color-cream)] transition-transform duration-150 hover:-translate-y-0.5"
        >
          Browse the guides →
        </a>
      </div>
    </section>
  );
}
