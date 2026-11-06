import "server-only";
import { markExpired, tokenFor, type Provider } from "@/lib/connections";
import { DEFAULT_BRAND } from "@/lib/brand";
import { CHANNEL_LABEL } from "@/lib/channels";
import { PlatformError } from "@/lib/platforms/config";
import { publishLinkedinPost } from "@/lib/platforms/linkedin";
import { publishCarousel, publishToPage } from "@/lib/platforms/meta";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Card, Channel } from "@/lib/types";
import { sendNewsletter } from "@/lib/newsletter/send";
import { renderCard } from "./cards";

// Publishes approved posts that are due. The database decides what is due
// and locks each post while it is published (claim_due_posts), so two runs
// can never post the same thing. Only text whose fingerprint matches the
// approval is ever claimed.

interface ClaimedPost {
  id: string;
  user_id: string;
  channel: Channel;
  title: string;
  body: string;
  cards: Card[];
}

export interface PublishResult {
  postId: string;
  channel: Channel;
  ok: boolean;
  url?: string | null;
  error?: string;
  willRetry?: boolean;
}

type Admin = ReturnType<typeof createAdminClient>;

async function carouselUrls(admin: Admin, post: ClaimedPost): Promise<string[]> {
  const { data: profile } = await admin
    .from("profiles")
    .select("firm, brand_cover, brand_card, brand_accent")
    .eq("id", post.user_id)
    .maybeSingle();
  const firm = profile?.firm ?? "";
  const brand = profile ? { cover: profile.brand_cover, card: profile.brand_card, accent: profile.brand_accent } : DEFAULT_BRAND;
  const bucket = admin.storage.from("carousel");
  const paths: string[] = [];
  for (const [i, card] of post.cards.entries()) {
    const jpeg = await renderCard(card, i, post.cards.length, firm, brand);
    const path = `${post.user_id}/${post.id}/${String(i + 1).padStart(2, "0")}.jpg`;
    const { error } = await bucket.upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
    if (error) throw new PlatformError("Junior could not prepare the carousel images. It will try again shortly.", { retryable: true });
    paths.push(path);
  }
  // Instagram fetches the images straight away; an hour is plenty.
  const { data, error } = await bucket.createSignedUrls(paths, 3600);
  const urls = (data ?? []).map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
  if (error || urls.length !== paths.length) {
    throw new PlatformError("Junior could not prepare the carousel images. It will try again shortly.", { retryable: true });
  }
  return urls;
}

async function publishOne(admin: Admin, post: ClaimedPost): Promise<{ id: string; url: string | null }> {
  if (post.channel === "newsletter") return sendNewsletter(admin, post);
  const provider = post.channel as Provider;
  const conn = await tokenFor(post.user_id, provider);
  const label = CHANNEL_LABEL[post.channel];
  if (!conn) throw new PlatformError(`${label} is not connected. Connect it in Settings, then retry.`, { retryable: false });
  if (conn.expiresAt && conn.expiresAt.getTime() < Date.now()) {
    throw new PlatformError(`Junior's access to ${label} has expired. Reconnect it in Settings, then retry.`, {
      retryable: false,
      reconnect: true,
    });
  }

  switch (post.channel) {
    case "linkedin":
      return publishLinkedinPost(conn.externalId, conn.token, post.body);
    case "facebook":
      return publishToPage(conn.externalId, conn.token, post.body);
    case "instagram":
      return publishCarousel(conn.externalId, conn.token, await carouselUrls(admin, post), post.body);
  }
}

export async function runPublisher({ postId, limit = 10 }: { postId?: string; limit?: number } = {}): Promise<PublishResult[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_due_posts", { p_limit: limit, p_post_id: postId ?? null });
  if (error) throw new Error(`Could not claim due posts: ${error.message}`);

  const results: PublishResult[] = [];
  for (const post of (data ?? []) as ClaimedPost[]) {
    try {
      const published = await publishOne(admin, post);
      const { error: doneError } = await admin.rpc("complete_publish", {
        p_post_id: post.id,
        p_external_id: published.id,
        p_external_url: published.url,
      });
      // The post is live; if this fails the stuck-publish check asks the lawyer to confirm.
      if (doneError) console.error("Published but could not record it", post.id, doneError.message);
      results.push({ postId: post.id, channel: post.channel, ok: true, url: published.url });
    } catch (err) {
      const pe =
        err instanceof PlatformError
          ? err
          : new PlatformError("Something went wrong while publishing. Junior will try again shortly.", { retryable: true });
      if (!(err instanceof PlatformError)) console.error("Unexpected publish error", post.id, err);
      if (pe.reconnect) await markExpired(post.user_id, post.channel as Provider);
      const { data: failed } = await admin.rpc("fail_publish", {
        p_post_id: post.id,
        p_error: pe.message,
        p_retryable: pe.retryable,
      });
      results.push({
        postId: post.id,
        channel: post.channel,
        ok: false,
        error: pe.message,
        willRetry: Boolean((failed as { publish_retryable?: boolean } | null)?.publish_retryable),
      });
    }
  }
  return results;
}
