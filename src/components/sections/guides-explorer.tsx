"use client";

import { useMemo, useState } from "react";
import { categories, type Guide } from "@/lib/guides";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { GuideCard } from "@/components/sections/guide-card";

export function GuidesExplorer({
  guides,
  initialCategory = "ALL",
  initialDifficulty,
}: {
  guides: Guide[];
  initialCategory?: string;
  initialDifficulty?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return guides.filter((guide) => {
      const matchesCategory = category === "ALL" || guide.category === category;
      const matchesDifficulty = !initialDifficulty || guide.difficulty === initialDifficulty;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        guide.title.toLowerCase().includes(q) ||
        guide.teaser.toLowerCase().includes(q) ||
        guide.tools.some((tool) => tool.toLowerCase().includes(q));
      return matchesCategory && matchesDifficulty && matchesQuery;
    });
  }, [guides, category, query, initialDifficulty]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs options={["ALL", ...categories]} active={category} onChange={setCategory} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides…"
          className="text-mono w-full rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)] sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-mono mt-16 text-sm text-[var(--color-ink)]/50">
          Okay, even I haven&apos;t tested that yet. Try a different filter.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {filtered.map((guide, i) => (
            <GuideCard key={guide.slug} guide={guide} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
