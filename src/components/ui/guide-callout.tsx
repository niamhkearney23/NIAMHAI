import type { CalloutKind } from "@/lib/guides";

const kindMeta: Record<CalloutKind, { label: string; color: string }> = {
  why: { label: "Why this works", color: "var(--color-accent)" },
  do: { label: "Do this", color: "#2f6f45" },
  dont: { label: "Don't do this", color: "#a83232" },
  note: { label: "Niamh's note", color: "var(--color-accent)" },
  warning: { label: "⚠ Watch out", color: "#a83232" },
  "try-next": { label: "Try this next", color: "var(--color-accent)" },
};

export function GuideCallout({
  kind,
  heading,
  body,
}: {
  kind: CalloutKind;
  heading?: string;
  body: string;
}) {
  const meta = kindMeta[kind];
  return (
    <div
      style={{ borderLeftColor: meta.color }}
      className="rounded-r-lg border-y border-r border-[var(--color-line)] border-l-4 bg-[var(--color-paper)] px-5 py-4"
    >
      <p
        style={{ color: meta.color }}
        className="text-mono text-[11px] font-bold uppercase tracking-[0.12em]"
      >
        {heading ?? meta.label}
      </p>
      <p className="mt-2 text-base leading-relaxed text-[var(--color-ink)]/85">{body}</p>
    </div>
  );
}
