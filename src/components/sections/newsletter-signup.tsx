"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-display text-3xl sm:text-4xl">I test a stupid amount of AI.</p>
      <p className="mt-3 text-base text-[var(--color-ink)]/70 sm:text-lg">
        Once a week I&apos;ll send you the stuff that was actually worth keeping.
      </p>

      {submitted ? (
        <p className="text-mono mt-6 text-sm font-semibold uppercase tracking-wide text-[var(--color-accent)]">
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
            className="text-mono flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="text-mono inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-xs font-bold uppercase tracking-wide text-[var(--color-cream)] transition-transform duration-150 hover:-translate-y-0.5"
          >
            Send me the good stuff →
          </button>
        </form>
      )}
      <p className="text-mono mt-4 text-xs text-[var(--color-ink)]/45">
        No daily &quot;AI NEWS 🚨&quot;. Promise.
      </p>
    </div>
  );
}
