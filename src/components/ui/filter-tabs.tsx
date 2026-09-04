"use client";

export function FilterTabs({
  options,
  active,
  onChange,
}: {
  options: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option === active;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`text-mono rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-150 ${
              isActive
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                : "border-[var(--color-line)] text-[var(--color-ink)]/60 hover:border-[var(--color-ink)]/40"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
