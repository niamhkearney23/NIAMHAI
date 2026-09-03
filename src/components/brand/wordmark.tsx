const sizes = {
  header: {
    wrap: "gap-1.5",
    name: "text-xl sm:text-2xl",
    ai: "text-[10px] sm:text-xs px-1.5 py-0.5",
  },
  hero: {
    wrap: "gap-3",
    name: "text-6xl sm:text-8xl md:text-9xl",
    ai: "text-base sm:text-xl px-2.5 py-1",
  },
} as const;

export function Wordmark({
  size = "header",
  tone = "ink",
}: {
  size?: keyof typeof sizes;
  tone?: "ink" | "cream";
}) {
  const s = sizes[size];
  const nameColor = tone === "cream" ? "text-[var(--color-cream)]" : "text-[var(--color-ink)]";
  const aiColors =
    tone === "cream"
      ? "bg-[var(--color-cream)] text-[var(--color-red)]"
      : "bg-[var(--color-red)] text-[var(--color-cream)]";

  return (
    <span className={`inline-flex items-center ${s.wrap}`}>
      <span className={`text-display leading-none ${s.name} ${nameColor}`}>N1AMH</span>
      <span
        className={`text-display leading-none rounded-sm ${s.ai} ${aiColors}`}
      >
        AI
      </span>
    </span>
  );
}
