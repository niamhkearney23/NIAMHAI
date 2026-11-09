"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { anthropicConfigured, demoDraftsEnabled, siteUrl } from "@/lib/env";
import { DraftError } from "@/lib/junior/draft";
import { draftSample } from "@/lib/junior/sample";
import { juniorFrom, resendConfigured, sendOne } from "@/lib/newsletter/resend";
import { detectPii, stripPii } from "@/lib/pii";
import { alreadyEmail, draftEmail, linkEmail } from "@/lib/sample-email";
import {
  clientIp,
  emailKey,
  ipHash,
  MAX_SOURCE_CHARS,
  MIN_SOURCE_CHARS,
  NEW_REQUESTS_PER_HOUR,
  SAMPLES_PER_IP_PER_HOUR,
  samplesEnabled,
  samplesPerDay,
  samplesToday,
} from "@/lib/samples";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Jurisdiction } from "@/lib/types";

export interface RequestState {
  done?: "check_email";
  error?: string;
}

export interface StartState {
  error?: string;
}

const Token = z.string().regex(/^[0-9a-f]{48}$/);
const Source = z
  .string()
  .trim()
  .min(MIN_SOURCE_CHARS, "Paste a little more: at least a few sentences from the judgment or your notes.")
  .max(MAX_SOURCE_CHARS, "That is too long for a sample. Paste the part you want to write about.");

const DAY_FULL =
  "Junior has given out all of today's free samples. Please try again tomorrow, or sign up to write your own.";

async function send(to: string, mail: { subject: string; text: string; html: string }) {
  await sendOne({ from: juniorFrom(), to: [to], ...mail });
}

// Step 1. Nothing is drafted yet: Junior emails a link, and drafts only when
// the person presses the button on the other side. That way nobody can spend
// Junior's money, or fill someone else's inbox, by typing in an address.
export async function requestSample(_prev: RequestState, formData: FormData): Promise<RequestState> {
  if (formData.get("website")) return { done: "check_email" }; // a bot filled the hidden field

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !z.email().safeParse(email).success) return { error: "Enter a valid email address." };
  const jurisdiction = z.enum(["MY", "SG", "BOTH"]).safeParse(formData.get("jurisdiction"));
  if (!jurisdiction.success) return { error: "Say where you practise." };
  const source = Source.safeParse(formData.get("source"));
  if (!source.success) return { error: source.error.issues[0]?.message ?? "Check the text and try again." };
  if (formData.get("consent") !== "on") {
    return { error: "Tick the box to say Junior may use this text to write your draft." };
  }
  if (!samplesEnabled() || !resendConfigured() || !(anthropicConfigured() || demoDraftsEnabled())) {
    return { error: "Free samples are not open yet." };
  }

  const admin = createAdminClient();
  const ip = ipHash(clientIp(await headers()));
  // Personal details come out before anything is stored or sent to Claude.
  // There is nobody to ask here, so the usual defaults apply.
  const { text: cleaned, replaced } = stripPii(
    source.data,
    detectPii(source.data).filter((f) => f.defaultStrip),
  );

  const key = emailKey(email);
  const { data: existing } = await admin
    .from("sample_requests")
    .select("id, email, status, token, link_sent_at, drafted_at")
    .eq("email_key", key)
    .maybeSingle();

  const lastMailed = existing?.link_sent_at ? new Date(existing.link_sent_at).getTime() : 0;
  const sentRecently = (minutes: number) => Date.now() - lastMailed < minutes * 60_000;

  // The page says the same thing whatever the address's history, so it cannot
  // be used to find out who has tried Junior. The email carries the real answer.
  if (existing?.status === "drafted") {
    // The link email went out before the draft, so only a later email counts as "already told".
    const alreadyTold = lastMailed > new Date(existing.drafted_at ?? 0).getTime() && sentRecently(10);
    if (!alreadyTold) {
      await send(existing.email, alreadyEmail()).catch((e) => console.error("Sample notice failed", e));
      await admin.from("sample_requests").update({ link_sent_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return { done: "check_email" };
  }
  if (existing?.status === "drafting") return { done: "check_email" };

  // Only new work counts against the limits: someone who has had their sample is told so above.
  const { count: fromHere } = await admin
    .from("sample_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip)
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((fromHere ?? 0) >= SAMPLES_PER_IP_PER_HOUR) {
    return { error: "There have been a lot of requests from your network just now. Please try again in an hour." };
  }
  const { count: everyone } = await admin
    .from("sample_requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((everyone ?? 0) >= NEW_REQUESTS_PER_HOUR) {
    return { error: "Junior is very busy just now. Please try again in an hour." };
  }
  if ((await samplesToday(admin)) >= samplesPerDay()) return { error: DAY_FULL };

  const followUp = formData.get("follow_up") === "on";
  const fields = {
    jurisdiction: jurisdiction.data,
    source_text: cleaned,
    redactions: replaced,
    follow_up_ok: followUp,
    ip_hash: ip,
  };

  let token: string;
  if (existing) {
    token = existing.token;
    const { error } = await admin.from("sample_requests").update({ ...fields, status: "pending", error: null }).eq("id", existing.id);
    if (error) return { error: "That did not work. Please try again." };
    if (sentRecently(2)) return { done: "check_email" };
  } else {
    token = randomBytes(24).toString("hex");
    const { error } = await admin.from("sample_requests").insert({ ...fields, email, email_key: key, token });
    if (error?.code === "23505") return { done: "check_email" }; // a double submit beat us to it
    if (error) {
      console.error("Sample request failed", error);
      return { error: "That did not work. Please try again." };
    }
  }

  try {
    await send(email, linkEmail(`${siteUrl()}/try/confirm/${token}`));
  } catch (e) {
    console.error("Sample link email failed", e);
    return { error: "Junior could not send the email just now. Please try again in a few minutes." };
  }
  await admin.from("sample_requests").update({ link_sent_at: new Date().toISOString() }).eq("token", token);
  return { done: "check_email" };
}

// Step 2, from the link in the email. A button, not an automatic run: email
// scanners open links too. Takes up to a minute, so the page allows 300 seconds.
export async function startSample(_prev: StartState, formData: FormData): Promise<StartState> {
  const token = String(formData.get("token") ?? "");
  if (!Token.safeParse(token).success) return { error: "This link is not valid." };
  if (!samplesEnabled()) return { error: "Free samples are paused for now. Please try again later." };

  const admin = createAdminClient();
  // The daily limit is for new drafts. A link that has already been used (a double
  // click, a second tab) just shows where things stand.
  const { data: current } = await admin.from("sample_requests").select("status").eq("token", token).maybeSingle();
  if (!current) return { error: "This link has expired." };
  if (current.status !== "drafting" && current.status !== "drafted" && (await samplesToday(admin)) >= samplesPerDay()) {
    return { error: `${DAY_FULL} This link stays valid for three days.` };
  }

  const { data: claimed, error: claimError } = await admin.rpc("claim_sample", { p_token: token });
  if (claimError) {
    console.error("Sample claim failed", claimError);
    return { error: "That did not work. Please try again." };
  }
  const row = (claimed as { id: string; email: string; jurisdiction: Jurisdiction; source_text: string }[] | null)?.[0];
  if (!row) {
    refresh(); // already written, being written, or used up: the page shows which
    return {};
  }

  try {
    const { draft, draftedWith } = await draftSample(row.jurisdiction, row.source_text);
    await admin
      .from("sample_requests")
      .update({ status: "drafted", draft, drafted_with: draftedWith, drafted_at: new Date().toISOString(), source_text: null })
      .eq("id", row.id);
    await send(row.email, draftEmail(draft)).catch((e) => console.error("Sample draft email failed", e));
  } catch (e) {
    if (!(e instanceof DraftError)) console.error("Sample drafting failed", e);
    const message = e instanceof DraftError ? e.message : "Something went wrong while drafting. Please try again.";
    await admin.from("sample_requests").update({ status: "failed", error: message }).eq("id", row.id);
  }
  refresh();
  return {};
}
