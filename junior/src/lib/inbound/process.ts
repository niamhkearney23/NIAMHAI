import "server-only";
import { inboundAddress } from "@/lib/env";
import { ExtractError, MAX_UPLOAD_BYTES, pdfToText } from "@/lib/extract";
import { DraftError, draftPosts } from "@/lib/junior/draft";
import { draftsToPosts } from "@/lib/junior/to-posts";
import { juniorFrom, resendConfigured, sendOne } from "@/lib/newsletter/resend";
import { detectPii, stripPii } from "@/lib/pii";
import { PlatformError } from "@/lib/platforms/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { bareAddress, cleanEmailText, domainOf, htmlToText, isAuthenticated, isAutoReply, isPdf } from "./email-text";
import { couldNotUseMail, draftedMail } from "./notices";
import { downloadAttachment, getReceivedEmail, listReceivedAttachments } from "./receiving";

// Turn a queued email into drafts. Runs on the server only: the webhook queues,
// this does the work, and claim_inbound lets exactly one run take each message.

const MAX_ATTEMPTS = 4;
const MAX_PER_DAY = 20;
const MIN_CHARS = 80;
const MAX_CHARS = 150_000;
const MAX_PDFS = 3;

export const REASON = {
  notOnboarded: "Junior needs your name, firm and voice samples first. Finish setting up in Settings, then send the email again.",
  unverified:
    "Junior could not confirm that this email came from you, so it did not use it. Send it from the address you sign in with, using a mail service that signs its email (Gmail, Outlook and most business email do).",
  noText: "Junior could not find enough text. Paste the judgment into the email, or attach it as a PDF with selectable text (not a scan).",
  tooLong: "That is too long. Send the part you want to write about.",
  limit: `You have reached today's limit of ${MAX_PER_DAY} emails. Try again tomorrow, or paste the text into Junior.`,
  auto: "Automatic reply, ignored.",
  fetch: "Junior could not read the email from the mail service. It will not retry.",
  looping: "Sent from Junior's own address, ignored.",
} as const;

type Admin = ReturnType<typeof createAdminClient>;

interface Row {
  id: string;
  resend_email_id: string;
  user_id: string;
  sender: string;
  attempts: number;
}

export interface InboundResult {
  resendEmailId: string;
  status: "drafted" | "rejected" | "failed";
  reason?: string;
}

export async function runInbound({ resendEmailId, limit = 3 }: { resendEmailId?: string; limit?: number } = {}): Promise<InboundResult[]> {
  if (!inboundAddress()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_inbound", { p_resend_email_id: resendEmailId ?? null, p_limit: limit });
  if (error) {
    console.error("Inbound claim failed", error);
    return [];
  }
  const results: InboundResult[] = [];
  for (const row of (data ?? []) as Row[]) results.push(await processOne(admin, row));
  return results;
}

async function settle(
  admin: Admin,
  row: Row,
  patch: { status: "drafted" | "rejected" | "failed"; reason?: string; retryable?: boolean; briefId?: string; redactions?: number },
): Promise<void> {
  const retrying = patch.status === "failed" && Boolean(patch.retryable) && row.attempts < MAX_ATTEMPTS;
  const now = new Date();
  const { error } = await admin
    .from("inbound_messages")
    .update({
      status: patch.status,
      reason: patch.reason ?? null,
      retryable: retrying,
      next_attempt_at: retrying ? new Date(now.getTime() + 2 ** row.attempts * 60_000).toISOString() : null,
      brief_id: patch.briefId ?? null,
      redactions: patch.redactions ?? 0,
      processed_at: retrying ? null : now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", row.id);
  if (error) console.error("Could not record the result of an inbound message", error);
}

async function tell(row: Row, mail: { subject: string; text: string; html: string }): Promise<void> {
  if (!resendConfigured()) return;
  try {
    await sendOne({ from: juniorFrom(), to: [row.sender], ...mail });
  } catch (e) {
    console.error("Could not email the lawyer about an inbound message", e);
  }
}

/** Refuse a message for a reason the lawyer can act on, and say so. */
async function reject(admin: Admin, row: Row, reason: string, { silent = false } = {}): Promise<InboundResult> {
  await settle(admin, row, { status: "rejected", reason });
  if (!silent) await tell(row, couldNotUseMail(reason));
  return { resendEmailId: row.resend_email_id, status: "rejected", reason };
}

async function fail(admin: Admin, row: Row, reason: string, retryable: boolean): Promise<InboundResult> {
  await settle(admin, row, { status: "failed", reason, retryable });
  if (!retryable || row.attempts >= MAX_ATTEMPTS) await tell(row, couldNotUseMail(reason));
  return { resendEmailId: row.resend_email_id, status: "failed", reason };
}

async function processOne(admin: Admin, row: Row): Promise<InboundResult> {
  try {
    return await draftFromEmail(admin, row);
  } catch (e) {
    console.error("Inbound processing failed", row.resend_email_id, e);
    return fail(admin, row, "Something went wrong while Junior read your email.", true);
  }
}

async function draftFromEmail(admin: Admin, row: Row): Promise<InboundResult> {
  const { data: profile } = await admin.from("profiles").select("*").eq("id", row.user_id).maybeSingle();
  if (!profile?.onboarded_at) return reject(admin, row, REASON.notOnboarded);

  let email;
  try {
    email = await getReceivedEmail(row.resend_email_id);
  } catch (e) {
    if (e instanceof PlatformError) return fail(admin, row, e.retryable ? e.message : REASON.fetch, e.retryable);
    throw e;
  }

  // Never answer machines, and never answer ourselves.
  if (isAutoReply(email.headers)) return reject(admin, row, REASON.auto, { silent: true });
  const ours = process.env.NEWSLETTER_FROM_DOMAIN?.toLowerCase();
  if (ours && domainOf(row.sender) === ours) return reject(admin, row, REASON.looping, { silent: true });

  // The sender is who Resend's own checks say it is, and it is the lawyer.
  if (!isAuthenticated(email.authentication) || bareAddress(email.from) !== row.sender) {
    // One notice a day is enough: a forged sender could otherwise make us email the real one repeatedly.
    const { count } = await admin
      .from("inbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id)
      .eq("reason", REASON.unverified)
      .gte("received_at", new Date(Date.now() - 24 * 3600_000).toISOString());
    return reject(admin, row, REASON.unverified, { silent: (count ?? 0) >= 1 });
  }

  const { count: today } = await admin
    .from("inbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", row.user_id)
    .eq("status", "drafted")
    .gte("received_at", new Date(Date.now() - 24 * 3600_000).toISOString());
  if ((today ?? 0) >= MAX_PER_DAY) return reject(admin, row, REASON.limit);

  // The text: a PDF if there is one (the judgment itself), otherwise the email body.
  const pdfTexts: string[] = [];
  let sourceName = "Forwarded email";
  const pdfs = (await listReceivedAttachments(row.resend_email_id).catch((e) => {
    if (e instanceof PlatformError && !e.retryable) return [];
    throw e;
  }))
    .filter((a) => isPdf(a) && (a.size ?? 0) <= MAX_UPLOAD_BYTES)
    .slice(0, MAX_PDFS);
  for (const pdf of pdfs) {
    try {
      const { text } = await pdfToText(await downloadAttachment(pdf.download_url, MAX_UPLOAD_BYTES));
      if (!pdfTexts.length) sourceName = pdf.filename.slice(0, 255);
      pdfTexts.push(text);
    } catch (e) {
      if (e instanceof ExtractError || (e instanceof PlatformError && !e.retryable)) continue; // a scan, or too large
      throw e;
    }
  }
  const note = cleanEmailText(email.text ?? htmlToText(email.html ?? ""));
  const source = (pdfTexts.length ? pdfTexts.join("\n\n") : note).trim();
  if (source.length < MIN_CHARS) return reject(admin, row, REASON.noText);
  if (source.length > MAX_CHARS) return reject(admin, row, REASON.tooLong);

  // There is nobody to ask, so personal details come out by default.
  const { text: cleaned, replaced } = stripPii(
    source,
    detectPii(source).filter((f) => f.defaultStrip),
  );

  let drafted;
  try {
    drafted = await draftPosts(profile as Profile, pdfTexts.length ? "pdf" : "text", cleaned);
  } catch (e) {
    if (e instanceof DraftError) return fail(admin, row, e.message, e.retryable);
    throw e;
  }

  const { data: brief, error: briefError } = await admin
    .from("briefs")
    .insert({
      user_id: row.user_id,
      title: drafted.drafts.brief_title.slice(0, 200),
      source_kind: pdfTexts.length ? "pdf" : "text",
      source_name: sourceName,
      source_text: cleaned,
      redactions: replaced,
      pii_kept: false,
      drafted_with: drafted.draftedWith,
    })
    .select("id")
    .single();
  if (briefError || !brief) {
    console.error("Brief insert failed", briefError);
    return fail(admin, row, "Junior drafted your posts but could not save them.", true);
  }
  const { error: postsError } = await admin
    .from("posts")
    .insert(draftsToPosts(brief.id, drafted.drafts).map((post) => ({ ...post, user_id: row.user_id })));
  if (postsError) {
    console.error("Posts insert failed", postsError);
    await admin.from("briefs").delete().eq("id", brief.id);
    return fail(admin, row, "Junior drafted your posts but could not save them.", true);
  }

  await settle(admin, row, { status: "drafted", briefId: brief.id, redactions: replaced });
  await tell(row, draftedMail({ briefId: brief.id, title: drafted.drafts.brief_title, redactions: replaced }));
  return { resendEmailId: row.resend_email_id, status: "drafted" };
}
