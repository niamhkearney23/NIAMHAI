import type { Guide } from "@/lib/guides";

export function GuideMetadata({ guide }: { guide: Guide }) {
  const items: { label: string; value: string }[] = [
    { label: "Time", value: guide.time },
    ...(guide.setupTime ? [{ label: "Setup", value: guide.setupTime }] : []),
    { label: "Difficulty", value: guide.difficulty },
    { label: "Tools", value: guide.tools.join(", ") },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[var(--color-muted)]">{item.label}</dt>
          <dd className="mt-0.5 font-medium text-[var(--color-ink)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
