import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 py-24 text-center sm:px-8">
      <p className="text-sm font-medium text-[var(--color-accent)]">404</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        AI couldn&apos;t find this either.
      </h1>
      <p className="mt-3 text-lg text-[var(--color-muted)]">
        Neither of us has tested that page yet.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
      >
        ← Back home
      </Link>
    </div>
  );
}
