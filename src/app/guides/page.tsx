import type { Metadata } from "next";
import { guides } from "@/lib/guides";
import { GuidesExplorer } from "@/components/sections/guides-explorer";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Guides",
  description: "Every N1AMH AI guide, filterable by category, difficulty and tool.",
};

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          kicker={`${guides.length} guides and counting`}
          title="All the"
          accentWord="guides."
          description="Bite-sized, tested, and built to be stolen. Filter by category, search by tool."
        />
        <div className="mt-10">
          <GuidesExplorer
            guides={guides}
            initialCategory={params.category ?? "ALL"}
            initialDifficulty={params.difficulty}
          />
        </div>
      </div>
    </div>
  );
}
