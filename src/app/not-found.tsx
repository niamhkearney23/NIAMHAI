import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 py-24 text-center sm:px-8">
      <p className="text-mono text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-accent)]">
        404
      </p>
      <h1 className="text-display mt-4 text-5xl sm:text-7xl">AI couldn&apos;t find this either.</h1>
      <p className="mt-4 text-lg text-[var(--color-ink)]/70">
        Neither of us has tested that page yet.
      </p>
      <Link
        href="/"
        className="text-mono mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-accent)] hover:underline"
      >
        ← Back home
      </Link>
    </div>
  );
}
