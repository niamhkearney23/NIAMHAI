export function ToolBadge({ tool, tone = "light" }: { tool: string; tone?: "light" | "dark" }) {
  const border = tone === "dark" ? "border-[var(--color-line-dark)]" : "border-[var(--color-line)]";
  const text = tone === "dark" ? "text-[var(--color-cream)]/80" : "text-[var(--color-ink)]/70";
  return (
    <span
      className={`text-mono inline-flex items-center rounded border ${border} px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${text}`}
    >
      {tool}
    </span>
  );
}
