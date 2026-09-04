import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGuide, guides, relatedGuides } from "@/lib/guides";
import { GuideMetadata } from "@/components/ui/guide-metadata";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { GuideCallout } from "@/components/ui/guide-callout";
import { ReadingProgress } from "@/components/ui/reading-progress";
import { GuideCard } from "@/components/sections/guide-card";

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
  const guideIndex = guides.findIndex((g) => g.slug === slug);
  const next = relatedGuides(slug, 2);

  return (
    <article>
      <ReadingProgress />
      <div className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/guides"
            className="text-mono text-xs font-bold uppercase tracking-wide text-[var(--color-accent)] hover:underline"
          >
            ← All guides
          </Link>

          <p className="text-mono mt-8 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-accent)]">
            {guide.category} / GUIDE {String(guideIndex + 1).padStart(2, "0")}
          </p>
          <h1 className="text-display mt-3 text-4xl sm:text-6xl">{guide.title}</h1>
          <p className="text-accent-serif mt-4 text-2xl text-[var(--color-ink)]/80">
            {guide.outcome}
          </p>

          <div className="mt-8 border-y border-[var(--color-line)] py-6">
            <GuideMetadata guide={guide} />
          </div>

          <div className="mt-12 space-y-8">
            {guide.blocks.map((block, i) => {
              if (block.type === "text") {
                return (
                  <div key={i}>
                    {block.heading && (
                      <h2 className="text-display text-2xl sm:text-3xl">{block.heading}</h2>
                    )}
                    {block.paragraphs.map((paragraph, pi) => (
                      <p
                        key={pi}
                        className="mt-4 text-base leading-relaxed text-[var(--color-ink)]/85 sm:text-lg"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                );
              }
              if (block.type === "prompt") {
                return <CopyPrompt key={i} prompt={block.prompt} label={block.label ?? "PROMPT"} />;
              }
              return <GuideCallout key={i} kind={block.kind} heading={block.heading} body={block.body} />;
            })}
          </div>

          {next.length > 0 && (
            <div className="mt-16 border-t border-[var(--color-line)] pt-10">
              <p className="text-display text-2xl sm:text-3xl">
                You&apos;ve got this working.{" "}
                <span className="text-accent-serif normal-case">What next?</span>
              </p>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {next.map((g) => {
                  const idx = guides.findIndex((guide) => guide.slug === g.slug);
                  return <GuideCard key={g.slug} guide={g} index={idx} />;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
