import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 py-24 text-center sm:px-8">
      <h1 className="text-display text-5xl sm:text-7xl">Not found</h1>
      <p className="mt-4 text-lg text-[var(--color-ink)]/70">
        That guide doesn&apos;t exist yet.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-red)] hover:underline"
      >
        ← Back home
      </Link>
    </div>
  );
}
