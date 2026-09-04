"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { guides } from "@/lib/guides";
import { stealablePrompts } from "@/lib/prompts";

type Item = {
  id: string;
  label: string;
  hint?: string;
  run: (router: ReturnType<typeof useRouter>) => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) setQuery("");
          return !v;
        });
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const quickActions: Item[] = useMemo(
    () => [
      {
        id: "random-prompt",
        label: "Give me a random prompt",
        hint: "→ /prompts",
        run: (r) => r.push("/prompts"),
      },
      {
        id: "beginner",
        label: "Show beginner guides",
        hint: "→ /guides",
        run: (r) => r.push("/guides?difficulty=EASY"),
      },
      {
        id: "automations",
        label: "Show automations",
        hint: "→ /guides",
        run: (r) => r.push("/guides?category=AUTOMATION"),
      },
      {
        id: "chatgpt",
        label: "Show ChatGPT guides",
        hint: "→ /guides",
        run: (r) => r.push("/guides?category=CHATGPT"),
      },
      {
        id: "surprise",
        label: "Surprise me",
        hint: "→ random guide",
        run: (r) => r.push(`/guides/${guides[Math.floor(Math.random() * guides.length)].slug}`),
      },
    ],
    []
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const guideItems: Item[] = guides.map((g) => ({
      id: `guide-${g.slug}`,
      label: g.title,
      hint: `GUIDE · ${g.category}`,
      run: (r) => r.push(`/guides/${g.slug}`),
    }));
    const promptItems: Item[] = stealablePrompts.map((p) => ({
      id: `prompt-${p.id}`,
      label: p.tag,
      hint: "PROMPT",
      run: (r) => r.push("/prompts"),
    }));

    if (q.length === 0) return { actions: quickActions, matches: guideItems.slice(0, 5) };

    const matches = [...guideItems, ...promptItems].filter((item) =>
      item.label.toLowerCase().includes(q)
    );
    return { actions: quickActions.filter((a) => a.label.toLowerCase().includes(q)), matches };
  }, [query, quickActions]);

  if (!open) return null;

  function select(item: Item) {
    item.run(router);
    setOpen(false);
  }

  const nothing = results.actions.length === 0 && results.matches.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--color-black)]/70 px-4 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--color-line-dark)] bg-[var(--color-charcoal)] text-[var(--color-cream)] shadow-2xl"
      >
        <div className="border-b border-[var(--color-line-dark)] px-4 py-3">
          <p className="text-mono mb-2 text-[10px] uppercase tracking-[0.15em] text-[var(--color-cream)]/40">
            What are you looking for?
          </p>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides, prompts, tools…"
            className="text-mono w-full bg-transparent text-lg outline-none placeholder:text-[var(--color-cream)]/30"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {nothing && (
            <p className="text-mono px-4 py-6 text-sm text-[var(--color-cream)]/50">
              Okay, even I haven&apos;t tested that yet.
            </p>
          )}
          {results.actions.length > 0 && (
            <div className="px-2 pb-2">
              <p className="text-mono px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--color-cream)]/30">
                Quick actions
              </p>
              {results.actions.map((item) => (
                <ResultRow key={item.id} item={item} onSelect={select} />
              ))}
            </div>
          )}
          {results.matches.length > 0 && (
            <div className="px-2 pb-2">
              <p className="text-mono px-2 py-1 text-[10px] uppercase tracking-widest text-[var(--color-cream)]/30">
                Guides &amp; prompts
              </p>
              {results.matches.map((item) => (
                <ResultRow key={item.id} item={item} onSelect={select} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ item, onSelect }: { item: Item; onSelect: (item: Item) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--color-cream)]/5"
    >
      <span>{item.label}</span>
      {item.hint && (
        <span className="text-mono text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
          {item.hint}
        </span>
      )}
    </button>
  );
}
