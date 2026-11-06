import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { MascotMessage } from "@/components/mascot";
import { ButtonLink, buttonClass, PageHeader } from "@/components/ui";
import { CHANNEL_LABEL, STATUS_LABEL, STATUSES } from "@/lib/channels";
import { requireProfile } from "@/lib/dal";
import { excerpt, queueItems, type QueueItem } from "@/lib/queries";
import { formatShort } from "@/lib/time";
import type { PostStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Queue" };

const EMPTY: Record<PostStatus, string> = {
  to_review: "Nothing waiting for you.",
  approved: "Approved posts without a time land here.",
  scheduled: "Nothing scheduled yet.",
  posted: "Posts you have published show here.",
};

function sortFor(status: PostStatus) {
  return (a: QueueItem, b: QueueItem) => {
    if (status === "scheduled") return (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? "");
    if (status === "posted") return (b.posted_at ?? "").localeCompare(a.posted_at ?? "");
    if (status === "approved") return (b.approved_at ?? "").localeCompare(a.approved_at ?? "");
    return b.updated_at.localeCompare(a.updated_at);
  };
}

export default async function QueuePage() {
  const profile = await requireProfile();
  const items = await queueItems();

  if (!items.length) {
    return (
      <div>
        <PageHeader eyebrow="Queue" title="Your posts" />
        <div className="flex flex-col items-start gap-6 rounded-[4px] border border-line bg-surface p-8">
          <MascotMessage title="Nothing in the queue yet">Paste a judgment or your notes and Junior will draft four posts for you.</MascotMessage>
          <ButtonLink href="/draft">Start a brief</ButtonLink>
        </div>
      </div>
    );
  }

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).sort(sortFor(s))])) as Record<
    PostStatus,
    QueueItem[]
  >;

  return (
    <div>
      <PageHeader eyebrow="Queue" title="Your posts">
        Everything Junior has drafted, from review to published.{" "}
        <Link href="/calendar" className="text-accent underline underline-offset-4">
          See the week
        </Link>
        .
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <section key={status} aria-labelledby={`col-${status}`} className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between border-b border-line-strong pb-2">
              <h2 id={`col-${status}`} className="font-serif text-xl text-ink">
                {STATUS_LABEL[status]}
              </h2>
              <span className="font-mono text-[12px] text-muted">{byStatus[status].length}</span>
            </div>
            {byStatus[status].length ? (
              <ul className="space-y-3">
                {byStatus[status].map((item) => (
                  <li key={item.id}>
                    <QueueCard item={item} timezone={profile.timezone} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">{EMPTY[status]}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function QueueCard({ item, timezone }: { item: QueueItem; timezone: string }) {
  const when =
    item.status === "scheduled" && item.scheduled_for
      ? formatShort(item.scheduled_for, timezone)
      : item.status === "posted" && item.posted_at
        ? `${item.published_via === "junior" ? "Published" : "Posted"} ${formatShort(item.posted_at, timezone)}`
        : item.status === "approved" && item.approved_at
          ? `Approved ${formatShort(item.approved_at, timezone)}`
          : `Drafted ${formatShort(item.updated_at, timezone)}`;
  const copyText = item.channel === "newsletter" ? `${item.title}\n\n${item.body}` : item.body;

  return (
    <article className="rounded-[4px] border border-line bg-surface p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-2">
          <span className="label text-accent">{CHANNEL_LABEL[item.channel]}</span>
          {item.publish_state === "failed" ? <span className="label text-danger">Needs attention</span> : null}
          {item.publish_state === "publishing" ? <span className="label">Publishing</span> : null}
        </span>
        <span className="font-mono text-[11px] whitespace-nowrap text-muted">{when}</span>
      </div>
      <Link href={`/briefs/${item.brief_id}?channel=${item.channel}`} className="mt-2 block group">
        <h3 className="font-serif text-[17px] leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{item.brief_title}</h3>
        <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-ink-2">{excerpt(item)}</p>
      </Link>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={`/briefs/${item.brief_id}?channel=${item.channel}`} size="sm" variant={item.status === "to_review" ? "primary" : "secondary"}>
          {item.status === "to_review" ? "Review" : "Open"}
        </ButtonLink>
        {item.status !== "to_review" ? <CopyButton text={copyText} /> : null}
        {item.external_url ? (
          <a href={item.external_url} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
            View live
          </a>
        ) : null}
      </div>
    </article>
  );
}
