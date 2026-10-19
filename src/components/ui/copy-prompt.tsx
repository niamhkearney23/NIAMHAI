"use client";

import { useState } from "react";

export function CopyPrompt({
  prompt,
  label = "Prompt",
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
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="font-mono px-5 py-5 text-sm leading-relaxed text-[var(--color-ink)]">
        {prompt}
      </p>
    </div>
  );
}
