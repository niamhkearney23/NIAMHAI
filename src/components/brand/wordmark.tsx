const sizes = {
  header: { text: "text-xl" },
  hero: { text: "text-4xl sm:text-5xl" },
  footer: { text: "text-3xl sm:text-4xl" },
} as const;

export function Wordmark({ size = "header" }: { size?: keyof typeof sizes }) {
  return (
    <span className={`inline-flex items-baseline font-bold tracking-tight ${sizes[size].text}`}>
      N<span className="text-[var(--color-accent)]">1</span>AMH
      <span className="ml-1.5 text-[0.45em] font-semibold text-[var(--color-muted)]">AI</span>
    </span>
  );
}
