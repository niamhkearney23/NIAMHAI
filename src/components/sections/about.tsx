export function About() {
  return (
    <section id="about" className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <p className="text-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-accent)]">
          A side note, not a mission statement
        </p>
        <h2 className="text-display mt-4 text-4xl sm:text-6xl">
          I&apos;m not an AI expert.
          <br />
          <span className="text-accent-serif normal-case">Which is kind of the point.</span>
        </h2>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-[var(--color-ink)]/80">
          <p>
            I&apos;m someone with too many tabs open who started using these tools for actual
            work. Not a developer. Not an AI researcher.
          </p>
          <p>I test things. I break things. I keep what works.</p>
          <p>Then I put it here.</p>
        </div>
        <div className="mt-8 rounded-lg border-l-4 border-[var(--color-accent)] bg-[var(--color-paper)] px-6 py-5">
          <p className="text-base leading-relaxed text-[var(--color-ink)]/85">
            No 47-minute YouTube tutorials. No &quot;10 AI tools that will CHANGE YOUR LIFE.&quot;
            No pretending a chatbot is sentient. Just things you can steal and use today.
          </p>
        </div>
      </div>
    </section>
  );
}
