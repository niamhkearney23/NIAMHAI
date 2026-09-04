"use client";

import { useState } from "react";
import Link from "next/link";
import { stealablePrompts } from "@/lib/prompts";
import { CopyPrompt } from "@/components/ui/copy-prompt";
import { SectionHeading } from "@/components/ui/section-heading";

export function StealPrompt() {
  const [index, setIndex] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const [showWhenNot, setShowWhenNot] = useState(false);
  const current = stealablePrompts[index];

  function go(dir: 1 | -1) {
    setIndex((i) => (i + dir + stealablePrompts.length) % stealablePrompts.length);
    setShowWhy(false);
    setShowWhenNot(false);
  }

  return (
    <section id="prompts" className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading kicker={current.tag} title="Steal" accentWord="something." />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous prompt"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] hover:border-[var(--color-ink)]/50"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next prompt"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] hover:border-[var(--color-ink)]/50"
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-8">
          <CopyPrompt prompt={current.prompt} label={current.tag} />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="text-mono text-left text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]"
          >
            Why it works →
          </button>
          {showWhy && <p className="text-sm text-[var(--color-ink)]/75">{current.why}</p>}

          <button
            type="button"
            onClick={() => setShowWhenNot((v) => !v)}
            className="text-mono text-left text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]"
          >
            When not to use it →
          </button>
          {showWhenNot && <p className="text-sm text-[var(--color-ink)]/75">{current.whenNot}</p>}
        </div>

        <Link
          href={`/guides/${current.guideSlug}`}
          className="text-mono mt-6 inline-flex text-xs font-bold uppercase tracking-wide underline"
        >
          Read the full guide →
        </Link>
      </div>
    </section>
  );
}
