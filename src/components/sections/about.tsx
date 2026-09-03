const tools = ["ChatGPT", "Claude", "Gemini", "Perplexity", "n8n", "Zapier"];

export function About() {
  return (
    <section
      id="about"
      className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-display text-4xl sm:text-6xl">
          Making AI useful,{" "}
          <span className="text-accent text-[1.1em] normal-case">
            not intimidating.
          </span>
        </h2>
        <p className="mt-8 text-lg leading-relaxed text-[var(--color-ink)]/85 sm:text-xl">
          I&apos;m not a developer and I&apos;m not an AI researcher — I&apos;m just
          genuinely obsessed with these tools. I spend an unreasonable amount
          of time testing them inside real work — inboxes, calendars,
          decisions, the boring stuff — and writing down what actually held
          up.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink)]/85 sm:text-xl">
          No hype, no &quot;AI will change everything&quot; speeches — just the setup
          steps, the exact prompts, and the guardrails, so you can steal the
          same thing and use it this afternoon.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {tools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-[var(--color-ink)]/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/70"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
