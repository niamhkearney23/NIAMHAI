"use client";

import { useSyncExternalStore } from "react";

type Pref = "system" | "light" | "dark";
const NEXT: Record<Pref, Pref> = { system: "light", light: "dark", dark: "system" };
const EVENT = "junior-theme";

function read(): Pref {
  try {
    const p = localStorage.getItem("junior-theme");
    return p === "light" || p === "dark" ? p : "system";
  } catch {
    return "system";
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Cycles system, light and dark. "System" follows the device setting. */
export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as Pref);

  function cycle() {
    const next = NEXT[pref];
    try {
      if (next === "system") localStorage.removeItem("junior-theme");
      else localStorage.setItem("junior-theme", next);
    } catch {}
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex h-8 items-center gap-2 rounded-[3px] border border-line px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:border-line-strong hover:text-ink"
      aria-label={`Theme: ${pref}. Change theme`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {pref === "light" ? null : pref === "dark" ? (
          <path d="M8 1.75 A6.25 6.25 0 0 1 8 14.25 Z" fill="currentColor" />
        ) : (
          <path d="M8 1.75 A6.25 6.25 0 0 1 8 14.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
        )}
      </svg>
      <span>{pref}</span>
    </button>
  );
}
