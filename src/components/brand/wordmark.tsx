const sizes = {
  header: { text: "text-xl sm:text-2xl" },
  hero: { text: "text-6xl sm:text-8xl md:text-[9rem]" },
  footer: { text: "text-6xl sm:text-8xl md:text-9xl" },
} as const;

export function Wordmark({
  size = "header",
  tone = "ink",
}: {
  size?: keyof typeof sizes;
  tone?: "ink" | "cream";
}) {
  const color = tone === "cream" ? "text-[var(--color-cream)]" : "text-[var(--color-ink)]";
  return (
    <span className={`text-display inline-flex items-baseline ${sizes[size].text} ${color}`}>
      N<span className="text-[var(--color-accent)]">1</span>AMH
      <span className="ml-2 text-[0.4em] tracking-wide">AI</span>
    </span>
  );
}
