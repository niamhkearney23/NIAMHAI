"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { addSubscribers, saveNewsletterSettings, type FormState } from "./actions";

export function NewsletterSettingsForm({
  initial,
  available,
}: {
  initial: { enabled: boolean; fromName: string; replyTo: string; footer: string };
  available: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveNewsletterSettings, {});
  // Controlled, so a validation error does not clear what was typed.
  const [v, setV] = useState(initial);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Sender name" htmlFor="from_name" hint="Shown in the inbox, such as your firm's name.">
          <input id="from_name" name="from_name" value={v.fromName} onChange={(e) => setV({ ...v, fromName: e.target.value })} maxLength={100} className={inputClass} />
        </Field>
        <Field label="Replies go to" htmlFor="reply_to" hint="Where readers' replies land.">
          <input id="reply_to" name="reply_to" type="email" value={v.replyTo} onChange={(e) => setV({ ...v, replyTo: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Footer" htmlFor="footer" hint="Your firm's name and address. It appears at the bottom of every issue.">
        <textarea id="footer" name="footer" rows={3} value={v.footer} onChange={(e) => setV({ ...v, footer: e.target.value })} maxLength={500} className={`${inputClass} resize-y`} />
      </Field>
      <label className={`flex items-start gap-3 text-[15px] ${available ? "text-ink" : "text-muted"}`}>
        <input
          type="checkbox"
          name="enabled"
          checked={v.enabled}
          onChange={(e) => setV({ ...v, enabled: e.target.checked })}
          disabled={!available}
          className="mt-1 accent-[var(--ink)]"
        />
        <span>
          Email approved newsletters to my subscribers at the time I pick
          {!available ? <span className="block text-sm">Not available yet: the server needs its email settings.</span> : null}
        </span>
      </label>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state.message ? <Notice tone="accent">{state.message}</Notice> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save newsletter settings"}
      </Button>
    </form>
  );
}

export function AddSubscribersForm() {
  const [people, setPeople] = useState("");
  const [how, setHow] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const result = await addSubscribers(prev, fd);
    if (result.message) {
      setPeople("");
      setConsent(false);
    }
    return result;
  }, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="People" htmlFor="people" hint="One per line: email, then a name if you like. Paste from a spreadsheet.">
        <textarea
          id="people"
          name="people"
          value={people}
          onChange={(e) => setPeople(e.target.value)}
          rows={5}
          className={`${inputClass} resize-y font-mono text-sm`}
          placeholder={"aminah@example.com, Aminah\nraj@example.com"}
        />
      </Field>
      <Field label="How they agreed" htmlFor="how" hint="For your records, such as 'Ticked the box on our enquiry form'.">
        <input id="how" name="how" value={how} onChange={(e) => setHow(e.target.value)} maxLength={300} className={inputClass} />
      </Field>
      <label className="flex items-start gap-3 text-[15px] text-ink">
        <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[var(--ink)]" />
        <span>Everyone on this list agreed to get my newsletter, and I can show how.</span>
      </label>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state.message ? <Notice tone="accent">{state.message}</Notice> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding" : "Add subscribers"}
      </Button>
    </form>
  );
}
