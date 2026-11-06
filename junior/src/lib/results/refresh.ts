import "server-only";
import { tokenFor, type Provider } from "@/lib/connections";
import { PlatformError } from "@/lib/platforms/config";
import { linkedinMetrics } from "@/lib/platforms/linkedin";
import { instagramMetrics, pagePostMetrics } from "@/lib/platforms/meta";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Channel } from "@/lib/types";

// Pulls likes and comments for posts Junior published in the last 90 days,
// and newsletter numbers from the send records. Numbers the lawyer typed in
// are left alone.

const STALE_MS = 6 * 3600 * 1000;
const LINKEDIN_NOTE = "LinkedIn only shares likes and comments with apps it has approved. Enter them from LinkedIn.";

interface Row {
  id: string;
  user_id: string;
  channel: Channel;
  external_id: string | null;
  post_results: { source: string; fetched_at: string | null } | { source: string; fetched_at: string | null }[] | null;
}

export async function refreshResults({ userId, force = false }: { userId?: string; force?: boolean } = {}) {
  const admin = createAdminClient();
  let query = admin
    .from("posts")
    .select("id, user_id, channel, external_id, post_results(source, fetched_at)")
    .eq("status", "posted")
    .eq("published_via", "junior")
    .gte("posted_at", new Date(Date.now() - 90 * 86400_000).toISOString())
    .limit(500);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;

  let updated = 0;
  let failed = 0;
  for (const post of (data ?? []) as Row[]) {
    const existing = Array.isArray(post.post_results) ? post.post_results[0] : post.post_results;
    if (existing?.source === "manual") continue;
    if (!force && existing?.fetched_at && Date.now() - new Date(existing.fetched_at).getTime() < STALE_MS) continue;

    const base = { post_id: post.id, user_id: post.user_id, source: "api", fetched_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    try {
      let values: Record<string, number | null>;
      if (post.channel === "newsletter") {
        const sends = admin.from("newsletter_sends");
        const [recipients, opens, clicks] = await Promise.all([
          sends.select("id", { count: "exact", head: true }).eq("post_id", post.id).neq("status", "queued"),
          sends.select("id", { count: "exact", head: true }).eq("post_id", post.id).not("opened_at", "is", null),
          sends.select("id", { count: "exact", head: true }).eq("post_id", post.id).not("clicked_at", "is", null),
        ]);
        values = { recipients: recipients.count ?? 0, opens: opens.count ?? 0, clicks: clicks.count ?? 0 };
      } else {
        if (!post.external_id) continue;
        const conn = await tokenFor(post.user_id, post.channel as Provider);
        if (!conn) throw new PlatformError("Reconnect this account to see its results.", { retryable: false });
        values =
          post.channel === "facebook"
            ? { ...(await pagePostMetrics(post.external_id, conn.token)) }
            : post.channel === "instagram"
              ? { ...(await instagramMetrics(post.external_id, conn.token)) }
              : { ...(await linkedinMetrics(post.external_id, conn.token)) };
      }
      await admin.from("post_results").upsert({ ...base, ...values, fetch_error: null }, { onConflict: "post_id" });
      updated++;
    } catch (error) {
      failed++;
      const message =
        post.channel === "linkedin" && error instanceof PlatformError && (error.options.status === 403 || error.options.status === 401)
          ? LINKEDIN_NOTE
          : error instanceof PlatformError
            ? error.message
            : "Junior could not fetch the results.";
      await admin.from("post_results").upsert({ ...base, fetch_error: message.slice(0, 300) }, { onConflict: "post_id" });
    }
  }
  return { updated, failed };
}
