"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { signUp, type SignupState } from "../actions";

export function SignupForm({ slug, firm }: { slug: string; firm: string }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signUp, {});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  if (state.done === "check_email") {
    return (
      <Notice tone="accent">
        Check your email. If you are not subscribed yet, click the link inside to confirm. If you already are, there is
        nothing more to do.
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div aria-hidden="true" className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Name (optional)" htmlFor="name">
        <input id="name" name="name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <label className="flex items-start gap-3 text-[15px] text-ink">
        <input type="checkbox" name="consent" required className="mt-1 accent-[var(--ink)]" />
        <span>I would like to get legal updates by email from {firm}. I can unsubscribe at any time.</span>
      </label>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending" : "Subscribe"}
      </Button>
    </form>
  );
}
