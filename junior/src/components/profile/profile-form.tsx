"use client";

import { useActionState, useMemo, useState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/onboarding/actions";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { JURISDICTION_LABEL, PRACTICE_AREAS } from "@/lib/channels";
import { detectPii } from "@/lib/pii";
import type { Jurisdiction, Profile } from "@/lib/types";

const STEPS = ["You", "Practice", "Voice", "Accounts"] as const;

export function ProfileForm({ profile, mode }: { profile: Profile; mode: "onboarding" | "settings" }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, {});
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile.full_name);
  const [firm, setFirm] = useState(profile.firm);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | "">(profile.onboarded_at ? profile.jurisdiction : "");
  const known = profile.practice_areas.filter((a) => PRACTICE_AREAS.includes(a));
  const [areas, setAreas] = useState<string[]>(known);
  const [other, setOther] = useState(profile.practice_areas.filter((a) => !PRACTICE_AREAS.includes(a)).join(", "));
  const [samples, setSamples] = useState<string[]>(() => {
    const s = [...profile.voice_samples];
    while (s.length < 3) s.push("");
    return s.slice(0, 3);
  });

  const stepped = mode === "onboarding";
  const fe = state.fieldErrors ?? {};

  const sampleWarnings = useMemo(
    () =>
      samples.map((s) =>
        detectPii(s)
          .filter((f) => f.kind !== "case_title")
          .map((f) => f.value),
      ),
    [samples],
  );

  const stepValid = [
    fullName.trim() && firm.trim() && jurisdiction,
    areas.length > 0 || other.trim(),
    samples.filter((s) => s.trim().length >= 40).length >= 2,
    true,
  ];

  // Jump back to the step with a server-side error.
  const errorStep = fe.full_name || fe.firm || fe.jurisdiction ? 0 : fe.practice_areas ? 1 : fe.voice_samples ? 2 : null;
  const visibleStep = stepped && errorStep !== null && step > errorStep ? errorStep : step;
  const show = (i: number) => !stepped || visibleStep === i;

  function toggleArea(area: string) {
    setAreas((list) => (list.includes(area) ? list.filter((a) => a !== area) : [...list, area]));
  }

  return (
    <form action={action} className="space-y-10">
      <input type="hidden" name="mode" value={mode} />
      {/* Keep every value in the form, whichever step is showing. */}
      <input type="hidden" name="full_name" value={fullName} />
      <input type="hidden" name="firm" value={firm} />
      <input type="hidden" name="jurisdiction" value={jurisdiction} />
      {areas.map((a) => (
        <input key={a} type="hidden" name="practice_areas" value={a} />
      ))}
      <input type="hidden" name="practice_other" value={other} />
      {samples.map((s, i) => (
        <input key={i} type="hidden" name="voice_samples" value={s} />
      ))}

      {stepped ? (
        <ol className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[11px] ${
                  i === visibleStep ? "border-ink bg-ink text-on-ink" : i < visibleStep ? "border-accent text-accent" : "border-line text-muted"
                }`}
                aria-current={i === visibleStep ? "step" : undefined}
              >
                {i + 1}
              </span>
              <span className={`label ${i === visibleStep ? "text-ink" : ""}`}>{label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {show(0) ? (
        <fieldset className="space-y-5">
          <legend className="mb-4 font-serif text-2xl text-ink">About you</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" htmlFor="full_name_input" error={fe.full_name}>
              <input
                id="full_name_input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className={inputClass}
                placeholder="Nur Aisyah Rahman"
              />
            </Field>
            <Field label="Firm" htmlFor="firm_input" error={fe.firm}>
              <input
                id="firm_input"
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                autoComplete="organization"
                className={inputClass}
                placeholder="Rahman & Co"
              />
            </Field>
          </div>
          <Field label="Where you practise" error={fe.jurisdiction}>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {(Object.keys(JURISDICTION_LABEL) as Jurisdiction[]).map((j) => (
                <label
                  key={j}
                  className={`flex cursor-pointer items-center gap-3 rounded-[3px] border px-3 py-2.5 text-[15px] ${
                    jurisdiction === j ? "border-ink bg-accent-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="jurisdiction_choice"
                    value={j}
                    checked={jurisdiction === j}
                    onChange={() => setJurisdiction(j)}
                    className="accent-[var(--ink)]"
                  />
                  {JURISDICTION_LABEL[j]}
                </label>
              ))}
            </div>
          </Field>
        </fieldset>
      ) : null}

      {show(1) ? (
        <fieldset className="space-y-5">
          <legend className="mb-4 font-serif text-2xl text-ink">Practice areas</legend>
          <p className="text-[15px] text-ink-2">Junior uses these to pick the right tone and hashtags.</p>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_AREAS.map((area) => {
              const on = areas.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleArea(area)}
                  className={`rounded-[3px] border px-3 py-1.5 text-sm ${
                    on ? "border-ink bg-ink text-on-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong"
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
          <Field label="Anything else" htmlFor="other_areas" hint="Separate with commas." error={fe.practice_areas}>
            <input
              id="other_areas"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              className={inputClass}
              placeholder="Syariah, Strata management"
            />
          </Field>
        </fieldset>
      ) : null}

      {show(2) ? (
        <fieldset className="space-y-5">
          <legend className="mb-4 font-serif text-2xl text-ink">Your voice</legend>
          <p className="text-[15px] text-ink-2">
            Paste two or three things you have posted before. Junior copies your rhythm, not your words. No posts yet? An
            article or a client update works too, with names taken out.
          </p>
          {fe.voice_samples ? <Notice tone="danger">{fe.voice_samples}</Notice> : null}
          {samples.map((s, i) => (
            <Field
              key={i}
              label={`Sample ${i + 1}${i === 2 ? " (optional)" : ""}`}
              htmlFor={`sample_${i}`}
              aside={<span className="font-mono text-[11px] text-muted">{s.length} / 5000</span>}
              error={sampleWarnings[i].length ? `This looks like it names someone: ${sampleWarnings[i].slice(0, 3).join(", ")}. Take it out before saving.` : null}
            >
              <textarea
                id={`sample_${i}`}
                value={s}
                maxLength={5000}
                onChange={(e) => setSamples((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                rows={6}
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </Field>
          ))}
        </fieldset>
      ) : null}

      {stepped && show(3) ? (
        <fieldset className="space-y-5">
          <legend className="mb-4 font-serif text-2xl text-ink">Accounts</legend>
          <p className="text-[15px] text-ink-2">
            Next, connect the accounts Junior should publish to. Junior only ever publishes what you approve, at the time
            you pick. You can skip this and copy posts by hand.
          </p>
          <ul className="divide-y divide-line rounded-[4px] border border-line bg-surface">
            {[
              ["Facebook Page", "Page posts"],
              ["Instagram", "Professional account linked to your Facebook Page"],
              ["LinkedIn", "Posts on your profile"],
            ].map(([name, detail]) => (
              <li key={name} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-[15px] font-medium text-ink">{name}</p>
                  <p className="text-sm text-muted">{detail}</p>
                </div>
                <span className="label">Next step</span>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {state.error && !Object.keys(fe).length ? <Notice tone="danger">{state.error}</Notice> : null}
      {state.saved && mode === "settings" ? <Notice tone="accent">Saved.</Notice> : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {stepped && visibleStep > 0 ? (
          <Button key="back" type="button" variant="secondary" onClick={() => setStep(visibleStep - 1)}>
            Back
          </Button>
        ) : null}
        {stepped && visibleStep < STEPS.length - 1 ? (
          // Distinct keys: reusing one element and switching it to type="submit"
          // mid-click would submit the form early.
          <Button key="continue" type="button" disabled={!stepValid[visibleStep]} onClick={() => setStep(visibleStep + 1)}>
            Continue
          </Button>
        ) : (
          <Button key="submit" type="submit" disabled={pending || (stepped && !stepValid.every(Boolean))}>
            {pending ? "Saving" : stepped ? "Save and connect accounts" : "Save changes"}
          </Button>
        )}
      </div>
    </form>
  );
}
