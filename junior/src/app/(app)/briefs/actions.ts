"use server";

import { z } from "zod";
import { CHANNEL_LABEL } from "@/lib/channels";
import { listConnections, type Provider } from "@/lib/connections";
import { getProfile, requireUser } from "@/lib/dal";
import { resendConfigured } from "@/lib/newsletter/resend";
import { runPublisher } from "@/lib/publish/publisher";
import { runRuleChecks } from "@/lib/guardrails";
import { createClient } from "@/lib/supabase/server";
import { zonedInputToUtc } from "@/lib/time";
import type { Post, PostContent } from "@/lib/types";

export interface PostResult {
  post?: Post;
  error?: string;
}

const POST_COLUMNS =
  "id, brief_id, channel, status, title, body, cards, checks, rule_checks, check_acks, scheduled_for, approved_at, approved_by, posted_at, publish_state, publish_error, publish_retryable, publish_attempts, next_attempt_at, external_url, published_via, created_at, updated_at";

const Id = z.uuid();

const ContentSchema = z.object({
  title: z.string().max(300),
  body: z.string().max(20000),
  cards: z
    .array(z.object({ heading: z.string().max(200), body: z.string().max(1000) }))
    .max(10, "A carousel can have up to 10 cards here."),
});

function toPost(row: Record<string, unknown>): Post {
  const pick = POST_COLUMNS.split(", ");
  return Object.fromEntries(pick.map((k) => [k, row[k]])) as unknown as Post;
}

// Messages raised by the workflow functions are written for the lawyer.
function friendly(error: { message?: string; code?: string } | null, fallback: string): string {
  if (!error?.message) return fallback;
  if (error.code === "P0001" || error.code === "P0002") return error.message;
  console.error("Post workflow error", error);
  return fallback;
}

async function loadPost(postId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).eq("id", postId).maybeSingle();
  if (error || !data) return { supabase, post: null };
  return { supabase, post: data as unknown as Post };
}

export async function savePost(postId: string, content: PostContent): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  const parsed = ContentSchema.safeParse(content);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the text and try again." };

  const { supabase, post } = await loadPost(postId);
  if (!post) return { error: "Post not found." };
  if (post.status === "posted") return { error: "This post has already gone out and cannot be edited." };

  const clean = {
    title: post.channel === "newsletter" ? parsed.data.title : "",
    body: parsed.data.body,
    cards: post.channel === "instagram" ? parsed.data.cards : [],
  };
  const { data, error } = await supabase
    .from("posts")
    .update({ ...clean, rule_checks: runRuleChecks({ channel: post.channel, ...clean }) })
    .eq("id", postId)
    .select(POST_COLUMNS)
    .single();

  if (error || !data) return { error: friendly(error, "Junior could not save that. Try again.") };
  return { post: toPost(data) };
}

export async function tickCheck(postId: string, key: string, ticked: boolean): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success || typeof key !== "string" || key.length > 100) return { error: "Check not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_check_ack", { p_post_id: postId, p_key: key, p_ticked: Boolean(ticked) });
  if (error || !data) return { error: friendly(error, "Junior could not update that check.") };
  return { post: toPost(data) };
}

export async function approvePost(postId: string): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  const { supabase, post } = await loadPost(postId);
  if (!post) return { error: "Post not found." };

  // Re-run the house rules on exactly what is stored before approving it.
  const rules = runRuleChecks({ channel: post.channel, title: post.title, body: post.body, cards: post.cards });
  if (JSON.stringify(rules) !== JSON.stringify(post.rule_checks)) {
    const { error } = await supabase.from("posts").update({ rule_checks: rules }).eq("id", postId);
    if (error) return { error: friendly(error, "Junior could not check the post. Try again.") };
  }

  const { data, error } = await supabase.rpc("approve_post", { p_post_id: postId });
  if (error || !data) return { error: friendly(error, "Junior could not approve that post.") };
  return { post: toPost(data) };
}

export async function schedulePost(postId: string, localValue: string): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  const profile = await getProfile();
  if (!profile) return { error: "Sign in again." };
  const at = zonedInputToUtc(localValue, profile.timezone);
  if (!at) return { error: "Pick a date and time." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("schedule_post", { p_post_id: postId, p_at: at.toISOString() });
  if (error || !data) return { error: friendly(error, "Junior could not schedule that post.") };
  return { post: toPost(data) };
}

async function simple(fn: "unschedule_post" | "mark_posted" | "return_to_review", postId: string, fallback: string): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, { p_post_id: postId });
  if (error || !data) return { error: friendly(error, fallback) };
  return { post: toPost(data) };
}

export async function unschedulePost(postId: string) {
  return simple("unschedule_post", postId, "Junior could not unschedule that post.");
}

export async function markPosted(postId: string) {
  return simple("mark_posted", postId, "Junior could not update that post.");
}

export async function returnToReview(postId: string) {
  return simple("return_to_review", postId, "Junior could not withdraw the approval.");
}

// Publishing runs straight away, inside this request, using the same
// publisher as the scheduled job.
async function publishAndReload(postId: string): Promise<PostResult> {
  try {
    await runPublisher({ postId, limit: 1 });
  } catch (error) {
    console.error("Publisher failed", error);
  }
  const { post } = await loadPost(postId);
  return post ? { post: toPost(post as unknown as Record<string, unknown>) } : { error: "Post not found." };
}

async function requireConnection(postId: string): Promise<string | null> {
  const { post } = await loadPost(postId);
  if (!post) return "Post not found.";
  if (post.channel === "newsletter") {
    const profile = await getProfile();
    return profile?.newsletter_enabled && resendConfigured()
      ? null
      : "Switch on your newsletter in Settings first, or copy it into your email tool.";
  }
  const connections = await listConnections();
  if (connections[post.channel as Provider]?.status !== "active") {
    return `Connect ${CHANNEL_LABEL[post.channel]} in Settings first, or copy the post and publish it yourself.`;
  }
  return null;
}

export async function publishNow(postId: string): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  const blocked = await requireConnection(postId);
  if (blocked) return { error: blocked };
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_now", { p_post_id: postId });
  if (error) return { error: friendly(error, "Junior could not publish that post.") };
  return publishAndReload(postId);
}

export async function retryPublish(postId: string): Promise<PostResult> {
  await requireUser();
  if (!Id.safeParse(postId).success) return { error: "Post not found." };
  const blocked = await requireConnection(postId);
  if (blocked) return { error: blocked };
  const supabase = await createClient();
  const { error } = await supabase.rpc("retry_publish", { p_post_id: postId });
  if (error) return { error: friendly(error, "Junior could not retry that post.") };
  return publishAndReload(postId);
}
