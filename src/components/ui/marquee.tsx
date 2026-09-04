export function Marquee({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-[var(--color-line-dark)] bg-[var(--color-black)] py-3">
      <div className="animate-marquee flex w-max gap-8">
        {loop.map((item, i) => (
          <span
            key={i}
            className="text-mono flex items-center gap-8 whitespace-nowrap text-xs uppercase tracking-[0.15em] text-[var(--color-cream)]/60"
          >
            {item}
            <span className="text-[var(--color-accent)]">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
