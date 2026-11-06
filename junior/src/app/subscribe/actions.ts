"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { siteUrl } from "@/lib/env";
import { fromAddress, resendConfigured, sendOne } from "@/lib/newsletter/resend";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SignupState {
  done?: "check_email";
  error?: string;
}

const Token = z.string().regex(/^[0-9a-f]{48}$/);
const SIGNUPS_PER_HOUR = 30;

// Public sign-up. Nobody is subscribed until they click the link in the
// confirmation email, so nobody can sign someone else up.
export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (formData.get("website")) return { done: "check_email" }; // a bot filled the hidden field
  const slug = String(formData.get("slug") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email address." };
  if (formData.get("consent") !== "on") return { error: "Tick the box to say you would like the newsletter." };
  if (!resendConfigured()) return { error: "Sign-ups are not open yet." };

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select("id, firm, newsletter_from_name, newsletter_reply_to")
    .eq("newsletter_slug", slug)
    .eq("newsletter_enabled", true)
    .maybeSingle();
  if (!owner) return { error: "This sign-up page is closed." };

  const { data: existing } = await admin
    .from("subscribers")
    .select("id, status, updated_at")
    .eq("user_id", owner.id)
    .eq("email", email) // stored lower-case
    .maybeSingle();
  // Same answer whatever the address's status, so the page cannot be used to
  // find out who subscribes to which firm.
  if (existing?.status === "subscribed") return { done: "check_email" };
  if (existing?.status === "pending" && Date.now() - new Date(existing.updated_at).getTime() < 120_000) {
    return { done: "check_email" };
  }
  // Each sign-up sends an email from our domain. Cap them per firm so the page
  // cannot be used to flood other people's inboxes.
  const { count: recent } = await admin
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", owner.id)
    .eq("status", "pending")
    .gte("updated_at", new Date(Date.now() - 3600_000).toISOString());
  if ((recent ?? 0) >= SIGNUPS_PER_HOUR) {
    console.warn(`Sign-up limit reached for ${slug}`);
    return { done: "check_email" };
  }

  const token = randomBytes(24).toString("hex");
  const row = { status: "pending", token, name, consent_source: "signup", consent_note: "", consented_at: null };
  const { error } = existing
    ? await admin.from("subscribers").update(row).eq("id", existing.id)
    : await admin.from("subscribers").insert({ ...row, user_id: owner.id, email });
  if (error) return { error: "That did not work. Please try again." };

  const firm = owner.newsletter_from_name || owner.firm;
  const link = `${siteUrl()}/subscribe/confirm/${token}`;
  await sendOne({
    from: fromAddress(firm),
    to: [email],
    subject: `Confirm your subscription to ${firm}`,
    text: `Please confirm you would like updates from ${firm}:\n\n${link}\n\nIf you did not ask for this, ignore this email and nothing will happen.`,
    html: `<p style="font-family:Helvetica,Arial,sans-serif;font-size:16px">Please confirm you would like updates from ${firm.replace(/[<>&]/g, "")}.</p><p><a href="${link}" style="font-family:Helvetica,Arial,sans-serif;font-size:16px">Confirm my subscription</a></p><p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#555">If you did not ask for this, ignore this email and nothing will happen.</p>`,
    reply_to: owner.newsletter_reply_to || undefined,
  }).catch((e) => console.error("Confirmation email failed", e));
  return { done: "check_email" };
}

export async function confirmSubscription(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!Token.safeParse(token).success) return;
  const admin = createAdminClient();
  await admin
    .from("subscribers")
    .update({
      status: "subscribed",
      consent_source: "signup",
      consent_note: "Signed up on the firm's page and confirmed by email",
      consented_at: new Date().toISOString(),
    })
    .eq("token", token)
    .eq("status", "pending");
  refresh();
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!Token.safeParse(token).success) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("token", token)
    .neq("status", "unsubscribed")
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function unsubscribeForm(formData: FormData): Promise<void> {
  await unsubscribe(String(formData.get("token") ?? ""));
  refresh();
}
