"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nav } from "@/lib/site";
import { quickTips } from "@/lib/tips";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [tip] = useState(() => quickTips[Math.floor(Math.random() * quickTips.length)]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-cream)]/40 text-[10px] font-bold uppercase tracking-wide text-[var(--color-cream)] sm:hidden"
      >
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[var(--color-black)] px-6 py-6 text-[var(--color-cream)] sm:hidden">
          <div className="flex items-center justify-between">
            <span className="text-mono text-xs uppercase tracking-widest text-[var(--color-cream)]/50">
              N1AMH AI
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-cream)]/40 text-xl"
            >
              ×
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-display py-2 text-5xl"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="text-mono text-xs leading-relaxed text-[var(--color-cream)]/50">
            TIP — {tip}
          </p>
        </div>
      )}
    </>
  );
}
