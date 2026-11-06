"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/dal";
import { detectPii } from "@/lib/pii";
import { refreshResults } from "@/lib/results/refresh";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const Id = z.uuid();

export async function logEnquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const postId = String(formData.get("post_id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const date = String(formData.get("received_on") ?? "");
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick the date it came in." };
  if (detectPii(note).some((f) => f.kind !== "case_title")) {
    return { error: "Leave out names and contact details. A short note like 'tenancy deposit query' is enough." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("post_enquiries").insert({ post_id: postId, note, received_on: date });
  if (error) return { error: "Junior could not log that. Try again." };
  refresh();
  return { ok: true };
}

export async function saveManualResults(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const postId = String(formData.get("post_id") ?? "");
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const likes = num("likes");
  const comments = num("comments");
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  if ([likes, comments].some((n) => n !== null && (!Number.isInteger(n) || n < 0 || n > 10_000_000))) {
    return { error: "Use whole numbers." };
  }
  const supabase = await createClient();
  // Update the row if there is one, otherwise create it. (An upsert would also
  // rewrite post_id, which lawyers may not change.)
  const { data: updated, error: updateError } = await supabase
    .from("post_results")
    .update({ likes, comments, source: "manual", updated_at: new Date().toISOString() })
    .eq("post_id", postId)
    .select("post_id");
  const { error } = updated?.length
    ? { error: updateError }
    : await supabase.from("post_results").insert({ post_id: postId, likes, comments, source: "manual" });
  if (error) {
    console.error("Manual results failed", error.message);
    return { error: "Junior could not save those numbers." };
  }
  refresh();
  return { ok: true };
}

export async function switchToAutomaticResults(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("post_results").update({ source: "api" }).eq("post_id", String(formData.get("post_id")));
  refresh();
}

export async function refreshNow() {
  const user = await requireUser();
  await refreshResults({ userId: user.id, force: true });
  refresh();
}
