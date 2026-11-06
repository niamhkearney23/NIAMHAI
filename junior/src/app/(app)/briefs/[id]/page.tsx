import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import { CHANNELS } from "@/lib/channels";
import { listConnections } from "@/lib/connections";
import { resendConfigured } from "@/lib/newsletter/resend";
import { brandOf, requireProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, utcToZonedInput } from "@/lib/time";
import type { Brief, Channel, Post } from "@/lib/types";
import { BriefWorkspace } from "./brief-workspace";

export const metadata: Metadata = { title: "Review" };
// "Publish now" runs the publisher inside the request; an Instagram carousel can take a minute.
export const maxDuration = 300;

const KIND_LABEL = { text: "Pasted text", pdf: "PDF", audio: "Voice note" } as const;

function tomorrowAtNine(timeZone: string): string {
  const tomorrow = utcToZonedInput(new Date(Date.now() + 24 * 3600 * 1000), timeZone);
  return `${tomorrow.slice(0, 10)}T09:00`;
}

export default async function BriefPage({ params, searchParams }: PageProps<"/briefs/[id]">) {
  const { id } = await params;
  const { channel } = await searchParams;
  const profile = await requireProfile();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: brief }, { data: posts }, connections, { count: subscriberCount }] = await Promise.all([
    supabase
      .from("briefs")
      .select("id, title, source_kind, source_name, source_text, redactions, pii_kept, drafted_with, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("posts")
      .select(
        "id, brief_id, channel, status, title, body, cards, checks, rule_checks, check_acks, scheduled_for, approved_at, approved_by, posted_at, publish_state, publish_error, publish_retryable, publish_attempts, next_attempt_at, external_url, published_via, created_at, updated_at",
      )
      .eq("brief_id", id),
    listConnections(),
    supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
  ]);
  const newsletter =
    profile.newsletter_enabled && resendConfigured()
      ? { status: "active" as const, display_name: `${subscriberCount ?? 0} subscriber${subscriberCount === 1 ? "" : "s"}` }
      : null;
  if (!brief || !posts?.length) notFound();

  const b = brief as Brief;
  const initial = (CHANNELS.includes(channel as Channel) ? channel : "linkedin") as Channel;

  return (
    <div>
      <PageHeader eyebrow={`Brief · ${formatDateTime(b.created_at, profile.timezone)}`} title={b.title || "Untitled brief"}>
        Review each draft, fix or tick off anything flagged, then approve. Nothing goes out until you do.
      </PageHeader>

      {b.drafted_with === "demo" ? (
        <div className="mb-6">
          <Notice>These are demo drafts built from your text, not written by Claude. Add an Anthropic key for real drafts.</Notice>
        </div>
      ) : null}

      <details className="mb-8 rounded-[4px] border border-line bg-surface">
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="label">Source</span>
          <span className="text-ink-2">
            {KIND_LABEL[b.source_kind]}
            {b.source_name ? ` · ${b.source_name}` : ""} · {b.source_text.length.toLocaleString("en-GB")} characters
          </span>
          {b.redactions > 0 ? <span className="text-accent">{b.redactions} personal details stripped</span> : null}
          {b.pii_kept ? <span className="text-danger">Personal details kept by choice</span> : null}
        </summary>
        <div className="max-h-96 overflow-y-auto border-t border-line px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2">
          {b.source_text}
        </div>
      </details>

      <BriefWorkspace
        posts={posts as unknown as Post[]}
        initialChannel={initial}
        timezone={profile.timezone}
        defaultSchedule={tomorrowAtNine(profile.timezone)}
        firm={profile.firm}
        connections={connections}
        newsletter={newsletter}
        brand={brandOf(profile)}
      />
    </div>
  );
}
