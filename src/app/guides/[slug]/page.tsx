import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide, guides } from "@/lib/guides";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.teaser,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <article className="px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/#guides"
          className="text-sm font-bold uppercase tracking-wide text-[var(--color-red)] hover:underline"
        >
          ← All guides
        </Link>

        <h1 className="text-display mt-6 text-4xl sm:text-6xl">{guide.title}</h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]/50">
          {guide.readTime}
        </p>
        <p className="mt-6 text-xl leading-relaxed text-[var(--color-ink)]/85">
          {guide.teaser}
        </p>

        <div className="mt-12 space-y-10">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-display text-2xl sm:text-3xl">{section.heading}</h2>
              {section.paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="mt-4 text-base leading-relaxed text-[var(--color-ink)]/85 sm:text-lg"
                >
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-4 space-y-3">
                  {section.list.map((item, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream-dim)] px-5 py-4 text-base leading-relaxed text-[var(--color-ink)]/90 sm:text-lg"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-[var(--color-line)] pt-8">
          <Link
            href="/#guides"
            className="text-sm font-bold uppercase tracking-wide text-[var(--color-red)] hover:underline"
          >
            ← Back to all guides
          </Link>
        </div>
      </div>
    </article>
  );
}
