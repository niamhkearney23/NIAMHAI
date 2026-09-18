import { guides } from "@/lib/guides";
import { GuideCard } from "@/components/sections/guide-card";
import { SectionHeading } from "@/components/ui/section-heading";

export function GuidesSection() {
  return (
    <section id="guides" className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          kicker="Bite-sized, tested, screenshot-worthy"
          title="Recent"
          accentWord="free"
          suffix="guides"
          description="Grab whatever looks fun. Every one of these has actually been used, not just written about."
        />

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {guides.map((guide, i) => (
            <GuideCard key={guide.slug} guide={guide} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
