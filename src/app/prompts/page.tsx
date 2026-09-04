import type { Metadata } from "next";
import Link from "next/link";
import { stealablePrompts } from "@/lib/prompts";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Prompts",
  description: "Every prompt worth stealing, in one place.",
};

export default function PromptsPage() {
  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          kicker={`${stealablePrompts.length} prompts, all tested`}
          title="Steal"
          accentWord="everything."
          description="Copy, paste, use it this afternoon. Each one links back to the full guide it came from."
        />

        <div className="mt-12 flex flex-col gap-14">
          {stealablePrompts.map((p) => (
            <div key={p.id} id={p.id}>
              <CopyPrompt prompt={p.prompt} label={p.tag} />
              <div className="mt-4 space-y-2 text-sm text-[var(--color-ink)]/75">
                <p>
                  <span className="text-mono font-bold uppercase tracking-wide text-[var(--color-accent)]">
                    Why it works —{" "}
                  </span>
                  {p.why}
                </p>
                <p>
                  <span className="text-mono font-bold uppercase tracking-wide text-[var(--color-accent)]">
                    When not to use it —{" "}
                  </span>
                  {p.whenNot}
                </p>
              </div>
              <Link
                href={`/guides/${p.guideSlug}`}
                className="text-mono mt-3 inline-flex text-xs font-bold uppercase tracking-wide underline"
              >
                Read the full guide →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
