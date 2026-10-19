"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-2xl font-bold tracking-tight sm:text-3xl">I test a stupid amount of AI.</p>
      <p className="mt-3 text-base text-[var(--color-muted)]">
        Once a week I&apos;ll send you the stuff that was actually worth keeping.
      </p>

      {status === "success" ? (
        <p className="mt-6 text-sm font-semibold text-[var(--color-accent)]">
          You&apos;re officially in my AI rabbit hole.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {status === "submitting" ? "Sending…" : "Send me the good stuff"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Couldn&apos;t save that just now — mind trying again in a bit?
        </p>
      )}

      <p className="mt-4 text-xs text-[var(--color-muted)]">
        No daily &quot;AI NEWS 🚨&quot;. Promise.
      </p>
    </div>
  );
}
