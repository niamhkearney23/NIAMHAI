"use client";

import { useState } from "react";

export function CopyPrompt({
  prompt,
  label = "PROMPT",
}: {
  prompt: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Clipboard API unavailable — the prompt is still fully visible to select and copy by hand.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-line-dark)] bg-[var(--color-black)] shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line-dark)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-[var(--color-cream)]/50">
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--color-cream)]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-cream)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {copied ? (
            <span className="text-[var(--color-accent)]">Copied ✓</span>
          ) : (
            "Copy prompt"
          )}
        </button>
      </div>
      <p className="text-mono px-5 py-6 text-sm leading-relaxed text-[var(--color-cream)] sm:text-base">
        {prompt}
      </p>
    </div>
  );
}
