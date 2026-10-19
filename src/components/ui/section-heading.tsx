export function SectionHeading({
  kicker,
  title,
  accentWord,
  suffix,
  description,
}: {
  kicker?: string;
  title: string;
  accentWord?: string;
  suffix?: string;
  description?: string;
}) {
  return (
    <div>
      {kicker && (
        <p className="mb-2 text-sm font-medium text-[var(--color-accent)]">{kicker}</p>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
        {accentWord && <span className="text-[var(--color-accent)]"> {accentWord}</span>}
        {suffix && <> {suffix}</>}
      </h2>
      {description && (
        <p className="mt-3 max-w-xl text-base text-[var(--color-muted)]">{description}</p>
      )}
    </div>
  );
}
