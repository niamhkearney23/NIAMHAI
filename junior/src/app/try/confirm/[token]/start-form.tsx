"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { startSample, type StartState } from "../../actions";

export function StartForm({ token, label }: { token: string; label: string }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startSample, {});
  return (
    <form action={action} className="w-full space-y-3">
      <input type="hidden" name="token" value={token} />
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Junior is writing. This takes up to a minute." : label}
      </Button>
    </form>
  );
}
