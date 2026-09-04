"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const examples = [
  "organise my inbox",
  "tell me what I'm avoiding",
  "build me a dashboard",
  "research this properly",
  "argue against my idea",
  "plan my week",
];

const testing = ["Claude", "ChatGPT", "n8n automations"];

function useTypewriter(words: string[]) {
  const [text, setText] = useState(words[0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let wordIndex = 0;
    let charIndex = words[0].length;
    let deleting = false;
    let timeoutId: number;

    function tick() {
      const word = words[wordIndex];
      if (!deleting) {
        charIndex++;
        if (charIndex > word.length) {
          deleting = true;
          timeoutId = window.setTimeout(tick, 1400);
          return;
        }
      } else {
        charIndex--;
        if (charIndex < 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          charIndex = 0;
        }
      }
      setText(words[wordIndex].slice(0, charIndex));
      timeoutId = window.setTimeout(tick, deleting ? 35 : 65);
    }

    timeoutId = window.setTimeout(tick, 900);
    return () => window.clearTimeout(timeoutId);
  }, [words]);

  return text;
}

export function Hero() {
  const typed = useTypewriter(examples);
  const [testingTool, setTestingTool] = useState(testing[0]);

  useEffect(() => {
    // Randomize only after mount — doing it during render would make the
    // server-rendered HTML and the client's first render disagree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTestingTool(testing[Math.floor(Math.random() * testing.length)]);
  }, []);

  return (
    <section className="border-b border-[var(--color-line)] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-accent-serif text-2xl sm:text-3xl">hey, it&apos;s Niamh —</p>
          <div className="mt-2">
            <Wordmark size="hero" />
          </div>
          <p className="text-display mt-6 text-3xl sm:text-5xl">
            AI is getting weird.
            <br />
            <span className="text-accent-serif normal-case">Let&apos;s make it useful.</span>
          </p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-ink)]/75 sm:text-xl">
            I spend an unreasonable amount of time testing AI so you don&apos;t have to. Real
            prompts. Real workflows. No fluff.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/prompts"
              className="text-mono inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[var(--color-cream)] transition-transform duration-150 hover:-translate-y-0.5"
            >
              [ Steal a prompt ]
            </Link>
            <Link
              href="/guides"
              className="text-mono inline-flex items-center gap-2 rounded-full border border-[var(--color-ink)]/25 px-6 py-3 text-xs font-bold uppercase tracking-wide transition-colors duration-150 hover:border-[var(--color-ink)]/60"
            >
              [ Explore the guides ]
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--color-line-dark)] bg-[var(--color-black)] text-[var(--color-cream)] shadow-[0_20px_60px_rgba(13,12,10,0.25)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-line-dark)] px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="text-mono text-[11px] uppercase tracking-widest text-[var(--color-cream)]/40">
              niamh&apos;s ai lab
            </span>
            <span className="text-mono ml-auto flex items-center gap-1.5 text-[11px] text-[var(--color-accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              ONLINE
            </span>
          </div>
          <div className="p-6">
            <p className="text-mono text-xs text-[var(--color-cream)]/40">prompt —</p>
            <p className="text-mono mt-3 min-h-16 text-xl leading-snug sm:text-2xl">
              {typed}
              <span className="caret text-[var(--color-accent)]">|</span>
            </p>
          </div>
          <div className="border-t border-[var(--color-line-dark)] px-4 py-2.5">
            <p className="text-mono text-[11px] uppercase tracking-widest text-[var(--color-cream)]/40">
              currently testing: <span className="text-[var(--color-accent)]">{testingTool}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
