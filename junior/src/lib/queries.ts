import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Channel, PostStatus } from "@/lib/types";

export interface QueueItem {
  id: string;
  brief_id: string;
  channel: Channel;
  status: PostStatus;
  title: string;
  body: string;
  scheduled_for: string | null;
  approved_at: string | null;
  posted_at: string | null;
  updated_at: string;
  brief_title: string;
}

const COLUMNS = "id, brief_id, channel, status, title, body, scheduled_for, approved_at, posted_at, updated_at, briefs(title)";

type Row = Omit<QueueItem, "brief_title"> & { briefs: { title: string } | { title: string }[] | null };

function flatten(rows: Row[] | null): QueueItem[] {
  return (rows ?? []).map(({ briefs, ...rest }) => ({
    ...rest,
    brief_title: (Array.isArray(briefs) ? briefs[0]?.title : briefs?.title) || "Untitled brief",
  }));
}

export async function queueItems(): Promise<QueueItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(COLUMNS).order("updated_at", { ascending: false }).limit(400);
  return flatten(data as Row[] | null);
}

/** Posts scheduled or posted between two instants. */
export async function calendarItems(from: Date, to: Date): Promise<QueueItem[]> {
  const supabase = await createClient();
  const range = `and(scheduled_for.gte.${from.toISOString()},scheduled_for.lt.${to.toISOString()}),and(posted_at.gte.${from.toISOString()},posted_at.lt.${to.toISOString()})`;
  const { data } = await supabase.from("posts").select(COLUMNS).in("status", ["scheduled", "posted"]).or(range);
  return flatten(data as Row[] | null);
}

export function excerpt(item: Pick<QueueItem, "channel" | "title" | "body">, length = 140): string {
  const text = (item.channel === "newsletter" && item.title ? item.title : item.body).replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}
