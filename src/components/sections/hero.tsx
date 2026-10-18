export function Hero() {
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-[var(--color-muted)]">Hey, it&apos;s Niamh —</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Let&apos;s make AI actually useful.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--color-muted)]">
          Real prompts, real workflows, no fluff. I spend an unreasonable amount of time testing
          AI so you don&apos;t have to.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#guides"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Browse the guides
          </a>
          <a
            href="#work-with-me"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]/30 hover:bg-[var(--color-bg-subtle)]"
          >
            Work with me
          </a>
        </div>
      </div>
    </section>
  );
}
