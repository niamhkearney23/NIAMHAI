import type { CalloutKind } from "@/lib/guides";

const kindMeta: Record<CalloutKind, { label: string; color: string }> = {
  why: { label: "Why this works", color: "var(--color-accent)" },
  do: { label: "Do this", color: "var(--color-green)" },
  dont: { label: "Don't do this", color: "var(--color-red)" },
  note: { label: "Niamh's note", color: "var(--color-accent)" },
  warning: { label: "Watch out", color: "var(--color-red)" },
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
      className="rounded-r-lg border-y border-r border-[var(--color-border)] border-l-2 bg-[var(--color-bg-subtle)] px-5 py-4"
    >
      <p style={{ color: meta.color }} className="text-sm font-semibold">
        {heading ?? meta.label}
      </p>
      <p className="mt-2 text-base leading-relaxed text-[var(--color-ink)]/85">{body}</p>
    </div>
  );
}
