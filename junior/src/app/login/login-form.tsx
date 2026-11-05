"use client";

import { useActionState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { sendLink, verifyCode, type LoginState } from "./actions";

export function LoginForm({ next, linkError }: { next: string; linkError?: boolean }) {
  const [emailState, sendAction, sending] = useActionState<LoginState, FormData>(sendLink, {
    step: "email",
    email: "",
    next,
    error: linkError ? "That sign-in link has expired or was already used. Send a new one." : undefined,
  });
  const [codeState, verifyAction, verifying] = useActionState<LoginState, FormData>(verifyCode, {
    step: "code",
    email: "",
    next,
  });

  if (emailState.step === "code") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="font-serif text-2xl text-ink">Check your email</p>
          <p className="text-[15px] text-ink-2">
            Junior sent a sign-in link and a code to <span className="font-medium text-ink">{emailState.email}</span>.
            Open the link on this device, or type the code here.
          </p>
        </div>
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="email" value={emailState.email} />
          <input type="hidden" name="next" value={emailState.next} />
          <Field label="Code" htmlFor="code" error={codeState.error}>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className={`${inputClass} font-mono text-lg tracking-[0.3em]`}
              placeholder="123456"
            />
          </Field>
          <Button type="submit" disabled={verifying} className="w-full">
            {verifying ? "Checking" : "Sign in"}
          </Button>
        </form>
        <form action={sendAction}>
          <input type="hidden" name="email" value={emailState.email} />
          <input type="hidden" name="next" value={emailState.next} />
          <button type="submit" disabled={sending} className="text-sm text-accent underline underline-offset-4">
            {sending ? "Sending" : "Send a new code"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={sendAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Work email" htmlFor="email" error={emailState.error}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={emailState.email}
          className={inputClass}
          placeholder="you@yourfirm.com.my"
        />
      </Field>
      <Button type="submit" disabled={sending} className="w-full">
        {sending ? "Sending" : "Email me a sign-in link"}
      </Button>
      <p className="text-sm text-muted">No password needed. New here? This also creates your account.</p>
    </form>
  );
}
