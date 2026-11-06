"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  message?: string;
}

const Email = z.email();

function slugify(firm: string): string {
  const base = firm
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "newsletter"}-${randomBytes(2).toString("hex")}`;
}

export async function saveNewsletterSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const fromName = String(formData.get("from_name") ?? "").trim().slice(0, 100);
  const replyTo = String(formData.get("reply_to") ?? "").trim().slice(0, 254);
  const footer = String(formData.get("footer") ?? "").trim().slice(0, 500);
  const enabled = formData.get("enabled") === "on";

  if (replyTo && !Email.safeParse(replyTo).success) return { error: "The reply-to address does not look right." };
  if (enabled && (!fromName || !replyTo || !footer)) {
    return { error: "Add a sender name, a reply-to address and a footer before switching the newsletter on." };
  }

  const supabase = await createClient();
  const { data: current } = await supabase.from("profiles").select("firm, newsletter_slug").eq("id", user.id).single();
  const { error } = await supabase
    .from("profiles")
    .update({
      newsletter_from_name: fromName,
      newsletter_reply_to: replyTo,
      newsletter_footer: footer,
      newsletter_enabled: enabled,
      newsletter_slug: current?.newsletter_slug ?? (enabled ? slugify(current?.firm ?? "") : null),
    })
    .eq("id", user.id);
  if (error) return { error: "Junior could not save your newsletter settings. Try again." };
  refresh();
  return { message: enabled ? "Saved. Approved newsletters will be emailed at the time you pick." : "Saved." };
}

export async function addSubscribers(_prev: FormState, formData: FormData): Promise<FormState> {
  // Row level security sets the owner; this checks the session.
  await requireUser();
  if (formData.get("consent") !== "on") {
    return { error: "Confirm that everyone on the list agreed to get your newsletter." };
  }
  const how = String(formData.get("how") ?? "").trim().slice(0, 300);
  const lines = String(formData.get("people") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5000);

  const parsed: { email: string; name: string }[] = [];
  let invalid = 0;
  for (const line of lines) {
    const [rawEmail, ...rest] = line.split(/[,;\t]/);
    const email = rawEmail.trim().toLowerCase();
    if (!Email.safeParse(email).success) {
      invalid++;
      continue;
    }
    if (!parsed.some((p) => p.email === email)) parsed.push({ email, name: rest.join(" ").trim().slice(0, 120) });
  }
  if (!parsed.length) return { error: invalid ? "None of those look like email addresses." : "Add at least one email address." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("subscribers").select("email");
  const known = new Set((existing ?? []).map((r) => r.email.toLowerCase()));
  const fresh = parsed.filter((p) => !known.has(p.email));
  const source = lines.length === 1 ? "manual" : "import";

  if (fresh.length) {
    const { error } = await supabase.from("subscribers").insert(
      fresh.map((p) => ({
        email: p.email,
        name: p.name,
        status: "subscribed",
        consent_source: source,
        consent_note: how || (source === "manual" ? "Added by the lawyer" : "Imported by the lawyer"),
        consented_at: new Date().toISOString(),
      })),
    );
    if (error) return { error: "Junior could not add them. Try again." };
  }
  refresh();
  const parts = [`${fresh.length} added`];
  if (parsed.length - fresh.length) parts.push(`${parsed.length - fresh.length} already on your list`);
  if (invalid) parts.push(`${invalid} skipped because the address looked wrong`);
  return { message: `${parts.join(", ")}.` };
}

export async function unsubscribeSubscriber(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("subscribers").update({ status: "unsubscribed" }).eq("id", String(formData.get("id")));
  refresh();
}

export async function deleteSubscriber(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("subscribers").delete().eq("id", String(formData.get("id")));
  refresh();
}
