import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { StatusDots } from "@/components/status-dots";
import { requireProfile, requireUser } from "@/lib/dal";
import { demoDraftsEnabled, transcriptionConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import type { Channel, PostStatus } from "@/lib/types";
import { DraftForm } from "./draft-form";

export const metadata: Metadata = { title: "Draft" };
// Drafting with Claude can take a while.
export const maxDuration = 300;

export default async function DraftPage() {
  const user = await requireUser();
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: briefs } = await supabase
    .from("briefs")
    .select("id, title, source_kind, created_at, posts(channel, status)")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <PageHeader eyebrow="New brief" title="What should Junior write about?">
          Paste a judgment, rough notes or a voice note. Junior drafts a LinkedIn post, an Instagram carousel, a
          Facebook post and a newsletter piece for you to review.
        </PageHeader>
        <DraftForm userId={user.id} audioEnabled={transcriptionConfigured()} demo={demoDraftsEnabled()} />
      </div>

      <aside className="space-y-4 lg:pt-2">
        <h2 className="label">Recent briefs</h2>
        {briefs?.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {briefs.map((b) => (
              <li key={b.id}>
                <Link href={`/briefs/${b.id}`} className="block py-3 hover:bg-sunken">
                  <p className="line-clamp-2 text-[15px] text-ink">{b.title || "Untitled brief"}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted">{formatDate(b.created_at, profile.timezone)}</span>
                    <StatusDots posts={(b.posts ?? []) as { channel: Channel; status: PostStatus }[]} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Your briefs will appear here.</p>
        )}
      </aside>
    </div>
  );
}
