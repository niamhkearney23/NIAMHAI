export function ToolBadge({ tool }: { tool: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)]">
      {tool}
    </span>
  );
}
