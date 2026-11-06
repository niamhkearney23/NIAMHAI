import "server-only";
import { DEFAULT_BRAND } from "@/lib/brand";
import { siteUrl } from "@/lib/env";
import { PlatformError } from "@/lib/platforms/config";
import type { createAdminClient } from "@/lib/supabase/admin";
import { renderNewsletter } from "./email";
import { fromAddress, resendConfigured, sendBatch } from "./resend";

type Admin = ReturnType<typeof createAdminClient>;

export const unsubscribeUrl = (token: string) => `${siteUrl()}/unsubscribe/${token}`;
export const oneClickUrl = (token: string) => `${siteUrl()}/api/unsubscribe/${token}`;

const BATCH = 100;

/**
 * Emails an approved newsletter to everyone subscribed. Each recipient gets a
 * send row first; only rows still queued are sent, so a retry picks up where
 * a failed run stopped and nobody gets it twice.
 */
export async function sendNewsletter(
  admin: Admin,
  post: { id: string; user_id: string; title: string; body: string },
): Promise<{ id: string; url: null; recipients: number }> {
  if (!resendConfigured()) throw new PlatformError("Newsletter sending is not set up on the server yet.", { retryable: false });

  const { data: profile } = await admin
    .from("profiles")
    .select("firm, newsletter_enabled, newsletter_from_name, newsletter_reply_to, newsletter_footer, brand_cover, brand_card, brand_accent")
    .eq("id", post.user_id)
    .single();
  if (!profile?.newsletter_enabled) throw new PlatformError("Switch on your newsletter in Settings first.", { retryable: false });

  const { data: subs } = await admin
    .from("subscribers")
    .select("id, email, token")
    .eq("user_id", post.user_id)
    .eq("status", "subscribed");
  if (!subs?.length) throw new PlatformError("You have no subscribers yet. Add them in Settings, then retry.", { retryable: false });

  await admin.from("newsletter_sends").upsert(
    subs.map((s) => ({ post_id: post.id, subscriber_id: s.id, user_id: post.user_id, email: s.email })),
    { onConflict: "post_id,subscriber_id", ignoreDuplicates: true },
  );
  const { data: queued } = await admin
    .from("newsletter_sends")
    .select("id, subscriber_id, email")
    .eq("post_id", post.id)
    .eq("status", "queued")
    .order("id");

  const tokens = new Map(subs.map((s) => [s.id, s.token as string]));
  const brand = profile.brand_cover ? { cover: profile.brand_cover, card: profile.brand_card, accent: profile.brand_accent } : DEFAULT_BRAND;
  const from = fromAddress(profile.newsletter_from_name || profile.firm);
  const rows = (queued ?? []).filter((r) => r.subscriber_id && tokens.has(r.subscriber_id));

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const emails = chunk.map((r) => {
      const token = tokens.get(r.subscriber_id!)!;
      const { html, text } = renderNewsletter({
        subject: post.title,
        body: post.body,
        firm: profile.firm,
        footer: profile.newsletter_footer,
        brand,
        unsubscribeUrl: unsubscribeUrl(token),
      });
      return {
        from,
        to: [r.email],
        subject: post.title,
        html,
        text,
        reply_to: profile.newsletter_reply_to || undefined,
        headers: { "List-Unsubscribe": `<${oneClickUrl(token)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        tags: [{ name: "post", value: post.id }],
      };
    });
    const ids = await sendBatch(emails, `newsletter-${post.id}-${chunk[0].id}-${chunk.length}`);
    const sentAt = new Date().toISOString();
    const updates = await Promise.all(
      chunk.map((r, j) => admin.from("newsletter_sends").update({ status: "sent", resend_id: ids[j] ?? null, sent_at: sentAt }).eq("id", r.id)),
    );
    // The emails have gone; a failed write here only loses tracking, so log it and carry on.
    const failed = updates.filter((u) => u.error);
    if (failed.length) console.error(`Newsletter ${post.id}: ${failed.length} send records not updated`, failed[0].error?.message);
  }

  const { count } = await admin
    .from("newsletter_sends")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post.id)
    .neq("status", "queued");
  await admin.from("post_results").upsert(
    { post_id: post.id, user_id: post.user_id, recipients: count ?? rows.length, source: "api", fetched_at: new Date().toISOString() },
    { onConflict: "post_id" },
  );
  return { id: `newsletter:${count ?? rows.length}`, url: null, recipients: count ?? rows.length };
}
