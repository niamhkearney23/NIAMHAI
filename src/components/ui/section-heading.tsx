export function SectionHeading({
  kicker,
  title,
  accentWord,
  suffix,
  description,
  tone = "light",
}: {
  kicker?: string;
  title: string;
  accentWord?: string;
  suffix?: string;
  description?: string;
  tone?: "light" | "dark";
}) {
  const textColor = tone === "dark" ? "text-[var(--color-cream)]" : "text-[var(--color-ink)]";
  const dimColor = tone === "dark" ? "text-[var(--color-cream)]/60" : "text-[var(--color-ink)]/60";

  return (
    <div>
      {kicker && (
        <p className="text-mono mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
          {kicker}
        </p>
      )}
      <h2 className={`text-display text-4xl sm:text-6xl ${textColor}`}>
        {title}
        {accentWord && (
          <>
            {" "}
            <span className="text-accent-serif text-[1.05em] normal-case">{accentWord}</span>
          </>
        )}
        {suffix && <> {suffix}</>}
      </h2>
      {description && (
        <p className={`mt-4 max-w-xl text-base sm:text-lg ${dimColor}`}>{description}</p>
      )}
    </div>
  );
}
