"use client";

import { useState } from "react";
import Link from "next/link";
import { guides, type Intent } from "@/lib/guides";
import { intents } from "@/lib/intents";
import { SectionHeading } from "@/components/ui/section-heading";

export function WhatAreYouTryingToDo() {
  const [active, setActive] = useState<Intent | null>(null);

  const matches = active ? guides.filter((g) => g.intents.includes(active)) : [];

  return (
    <section id="what-are-you-trying-to-do" className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading kicker="Almost like speaking to Niamh" title="What are you trying to do?" />

        <div className="mt-8 flex flex-wrap gap-3">
          {intents.map((intent) => {
            const isActive = active === intent.key;
            return (
              <button
                key={intent.key}
                type="button"
                onClick={() => setActive(isActive ? null : intent.key)}
                className={`text-mono rounded-full border px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors duration-150 ${
                  isActive
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                    : "border-[var(--color-line)] text-[var(--color-ink)]/70 hover:border-[var(--color-ink)]/40"
                }`}
              >
                ↗ {intent.label}
              </button>
            );
          })}
        </div>

        {active && (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {matches.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-5 transition-transform duration-150 hover:-translate-y-0.5"
              >
                <p className="text-mono text-[11px] uppercase tracking-wide text-[var(--color-accent)]">
                  {guide.category}
                </p>
                <p className="text-display mt-2 text-xl">{guide.title}</p>
                <p className="mt-2 text-sm text-[var(--color-ink)]/70">{guide.outcome}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
