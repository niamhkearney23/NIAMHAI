"use client";

import { useRouter } from "next/navigation";
import { guides } from "@/lib/guides";

export function RandomButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/guides/${guides[Math.floor(Math.random() * guides.length)].slug}`)}
      className={`text-mono inline-flex items-center gap-1.5 rounded-full border border-[var(--color-cream)]/25 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-cream)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] ${className}`}
    >
      Random useful thing ↗
    </button>
  );
}
