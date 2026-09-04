import type { Guide } from "@/lib/guides";

export function GuideMetadata({ guide }: { guide: Guide }) {
  const items: { label: string; value: string }[] = [
    { label: "TIME", value: guide.time },
    ...(guide.setupTime ? [{ label: "SETUP", value: guide.setupTime }] : []),
    { label: "DIFFICULTY", value: guide.difficulty },
    { label: "TOOLS", value: guide.tools.join(" / ") },
  ];

  return (
    <dl className="text-mono grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[var(--color-ink)]/45 tracking-[0.1em]">{item.label}</dt>
          <dd className="mt-1 font-semibold uppercase tracking-wide text-[var(--color-ink)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
