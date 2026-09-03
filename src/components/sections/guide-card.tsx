import Link from "next/link";
import type { Guide } from "@/lib/guides";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <article className="border-b border-[var(--color-line)] py-10 first:pt-0 last:border-b-0">
      <h3 className="text-display text-3xl sm:text-4xl">{guide.title}</h3>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-ink)]/80 sm:text-lg">
        {guide.teaser}
      </p>
      <Link
        href={`/guides/${guide.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--color-red)] hover:underline"
      >
        Read guide <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
