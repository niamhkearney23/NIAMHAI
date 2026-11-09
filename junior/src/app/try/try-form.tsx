"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { requestSample, type RequestState } from "./actions";

const PLACES = [
  ["MY", "Malaysia"],
  ["SG", "Singapore"],
  ["BOTH", "Both"],
] as const;

// Controlled inputs: React 19 clears an uncontrolled form after an action, which
// would wipe a long paste when the server has an error to report.
export function TryForm() {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestSample, {});
  const [email, setEmail] = useState("");
  const [place, setPlace] = useState<string>("MY");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [followUp, setFollowUp] = useState(false);

  if (state.done === "check_email") {
    return (
      <Notice tone="accent">
        Check your email. We have sent a link. Open it and press the button to get your draft. If this address has already
        had its free draft, the email says so.
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div aria-hidden="true" className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Email" htmlFor="email" hint="Your draft is sent here, and the link must be opened from this inbox.">
        <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="label">Where do you practise?</legend>
        <div className="flex flex-wrap gap-4 pt-1">
          {PLACES.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[15px] text-ink">
              <input type="radio" name="jurisdiction" value={value} checked={place === value} onChange={() => setPlace(value)} className="accent-[var(--ink)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label="Judgment extract or notes"
        htmlFor="source"
        aside={<span className="text-xs text-muted">{source.length.toLocaleString("en-GB")} characters</span>}
        hint="Paste the part you want to write about. At least a few sentences."
      >
        <textarea id="source" name="source" required rows={10} value={source} onChange={(e) => setSource(e.target.value)} className={`${inputClass} resize-y`} />
      </Field>
      <label className="flex items-start gap-3 text-[15px] text-ink">
        <input type="checkbox" name="consent" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[var(--ink)]" />
        <span>
          Junior may use this text to write my draft and email it to me. I will not paste anything I am not allowed to share.
        </span>
      </label>
      <label className="flex items-start gap-3 text-[15px] text-ink-2">
        <input type="checkbox" name="follow_up" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="mt-1 accent-[var(--ink)]" />
        <span>Optional: you may email me about Junior. I can say no at any time.</span>
      </label>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending" : "Email me my free draft"}
      </Button>
    </form>
  );
}
