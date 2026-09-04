import type { Metadata } from "next";
import { experiments } from "@/lib/experiments";
import { ExperimentCard } from "@/components/sections/experiment-card";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Lab",
  description: "Things I'm testing so you don't have to.",
};

export default function LabPage() {
  return (
    <div className="bg-[var(--color-black)] px-5 py-16 text-[var(--color-cream)] sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          kicker="No polish, just notes"
          title="N1AMH"
          accentWord="lab."
          description="Things I'm testing so you don't have to. Some work. Some don't. All of it's real."
          tone="dark"
        />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {experiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      </div>
    </div>
  );
}
