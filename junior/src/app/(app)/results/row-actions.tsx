"use client";

import { useActionState, useState } from "react";
import { Button, inputClass } from "@/components/ui";
import { logEnquiry, saveManualResults, type ActionState } from "./actions";

export function RowActions({
  postId,
  today,
  likes,
  comments,
  canEditNumbers,
}: {
  postId: string;
  today: string;
  likes: number | null;
  comments: number | null;
  canEditNumbers: boolean;
}) {
  const [open, setOpen] = useState<"enquiry" | "numbers" | null>(null);
  const [note, setNote] = useState("");
  const [enquiry, logAction, logging] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await logEnquiry(prev, fd);
    if (r.ok) {
      setOpen(null);
      setNote("");
    }
    return r;
  }, {});
  const [numbers, numbersAction, saving] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveManualResults(prev, fd);
    if (r.ok) setOpen(null);
    return r;
  }, {});

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-1">
        <Button type="button" size="sm" variant={open === "enquiry" ? "secondary" : "ghost"} onClick={() => setOpen(open === "enquiry" ? null : "enquiry")}>
          Log enquiry
        </Button>
        {canEditNumbers ? (
          <Button type="button" size="sm" variant={open === "numbers" ? "secondary" : "ghost"} onClick={() => setOpen(open === "numbers" ? null : "numbers")}>
            Enter numbers
          </Button>
        ) : null}
      </div>

      {open === "enquiry" ? (
        <form action={logAction} className="space-y-2 rounded-[3px] border border-line bg-bg p-3 text-left">
          <input type="hidden" name="post_id" value={postId} />
          <label className="label block" htmlFor={`enq-date-${postId}`}>
            Date it came in
          </label>
          <input id={`enq-date-${postId}`} type="date" name="received_on" defaultValue={today} max={today} className={inputClass} />
          <label className="label block" htmlFor={`enq-note-${postId}`}>
            Note (no names)
          </label>
          <input
            id={`enq-note-${postId}`}
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Tenancy deposit query"
            className={inputClass}
          />
          {enquiry.error ? <p className="text-sm text-danger">{enquiry.error}</p> : null}
          <Button type="submit" size="sm" disabled={logging}>
            {logging ? "Saving" : "Save enquiry"}
          </Button>
        </form>
      ) : null}

      {open === "numbers" ? (
        <form action={numbersAction} className="space-y-2 rounded-[3px] border border-line bg-bg p-3 text-left">
          <input type="hidden" name="post_id" value={postId} />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="label block">Likes</span>
              <input name="likes" type="number" min={0} defaultValue={likes ?? ""} className={inputClass} />
            </label>
            <label className="space-y-1">
              <span className="label block">Comments</span>
              <input name="comments" type="number" min={0} defaultValue={comments ?? ""} className={inputClass} />
            </label>
          </div>
          {numbers.error ? <p className="text-sm text-danger">{numbers.error}</p> : null}
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving" : "Save numbers"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
