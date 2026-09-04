import Link from "next/link";
import { guides } from "@/lib/guides";
import { GuideCard } from "@/components/sections/guide-card";
import { SectionHeading } from "@/components/ui/section-heading";

export function GuidesPreview() {
  const featured = guides.slice(0, 4);

  return (
    <section id="guides" className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            kicker="Bite-sized, tested, screenshot-worthy"
            title="Recent"
            accentWord="free"
            suffix="guides"
            description="Grab whatever looks fun. Every one of these has actually been used, not just written about."
          />
          <Link href="/guides" className="text-mono text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">
            All guides →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {featured.map((guide, i) => (
            <GuideCard key={guide.slug} guide={guide} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
