import type { Metadata } from "next";
import Link from "next/link";
import { MascotMessage } from "@/components/mascot";
import { ButtonLink, buttonClass, PageHeader, Panel } from "@/components/ui";
import { CHANNEL_LABEL, CHANNELS } from "@/lib/channels";
import { requireProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDate, rangeBounds, zonedDateKey } from "@/lib/time";
import type { Channel } from "@/lib/types";
import { refreshNow, useAutomaticResults } from "./actions";
import { RowActions } from "./row-actions";

export const metadata: Metadata = { title: "Results" };
export const maxDuration = 120;

const RANGES = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

interface Result {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  recipients: number | null;
  opens: number | null;
  clicks: number | null;
  source: "api" | "manual";
  fetch_error: string | null;
  fetched_at: string | null;
}

interface Row {
  id: string;
  brief_id: string;
  channel: Channel;
  posted_at: string;
  external_url: string | null;
  published_via: "junior" | "manual" | null;
  briefs: { title: string } | { title: string }[] | null;
  post_results: Result | Result[] | null;
  post_enquiries: { id: string }[];
}

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

function compact(n: number): string {
  return n >= 10_000
    ? new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n)
    : n.toLocaleString("en-GB");
}

function totals(rows: Row[]) {
  return rows.reduce(
    (t, r) => {
      const res = one(r.post_results);
      t.posts++;
      t.likes += res?.likes ?? 0;
      t.comments += res?.comments ?? 0;
      t.enquiries += r.post_enquiries.length;
      return t;
    },
    { posts: 0, likes: 0, comments: 0, enquiries: 0 },
  );
}

function Tile({ label, value, delta, period }: { label: string; value: number; delta: number | null; period: string }) {
  return (
    <div className="bg-bg p-5">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-2 font-sans text-4xl font-semibold text-ink">{compact(value)}</p>
      {delta !== null ? (
        <p className={`mt-1 text-sm ${delta > 0 ? "text-accent" : delta < 0 ? "text-danger" : "text-muted"}`}>
          {delta > 0 ? `Up ${compact(delta)}` : delta < 0 ? `Down ${compact(-delta)}` : "No change"} on the {period}
        </p>
      ) : null}
    </div>
  );
}

export default async function ResultsPage({ searchParams }: PageProps<"/results">) {
  const profile = await requireProfile();
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[0];
  const { since, prevSince } = rangeBounds(range.days);

  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(
      "id, brief_id, channel, posted_at, external_url, published_via, briefs(title), post_results(likes, comments, shares, recipients, opens, clicks, source, fetch_error, fetched_at), post_enquiries(id)",
    )
    .eq("status", "posted")
    .order("posted_at", { ascending: false })
    .limit(1000);
  if (prevSince) query = query.gte("posted_at", prevSince.toISOString());
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const current = since ? rows.filter((r) => new Date(r.posted_at) >= since) : rows;
  const previous = since ? rows.filter((r) => new Date(r.posted_at) < since) : [];
  const t = totals(current);
  const p = since ? totals(previous) : null;
  const period = `previous ${range.days} days`;
  const today = zonedDateKey(new Date(), profile.timezone);

  const byChannel = CHANNELS.map((ch) => ({ channel: ch, ...totals(current.filter((r) => r.channel === ch)) })).filter((c) => c.posts);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Results" title="How your posts are doing">
        Likes and comments come from Facebook and Instagram every hour. LinkedIn keeps them to itself for most apps, so
        enter those by hand. Log enquiries as they come in.
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Range" className="flex gap-1">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/results?range=${r.key}`}
              aria-current={r.key === range.key ? "page" : undefined}
              className={`rounded-[3px] border px-3 py-1.5 text-sm ${r.key === range.key ? "border-ink bg-ink text-on-ink" : "border-line text-ink-2 hover:border-line-strong"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <form action={refreshNow}>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Refresh now
          </button>
        </form>
      </div>

      {!current.length ? (
        <div className="flex flex-col items-start gap-6 rounded-[4px] border border-line bg-surface p-8">
          <MascotMessage title="Nothing published in this period">
            Once Junior publishes a post, or you mark one as posted, its results show here.
          </MascotMessage>
          <ButtonLink href="/queue" variant="secondary">
            Open the queue
          </ButtonLink>
        </div>
      ) : (
        <>
          <section aria-label="Totals" className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Posts published" value={t.posts} delta={p ? t.posts - p.posts : null} period={period} />
            <Tile label="Likes" value={t.likes} delta={p ? t.likes - p.likes : null} period={period} />
            <Tile label="Comments" value={t.comments} delta={p ? t.comments - p.comments : null} period={period} />
            <Tile label="Enquiries" value={t.enquiries} delta={p ? t.enquiries - p.enquiries : null} period={period} />
          </section>

          <section aria-labelledby="channel-heading" className="space-y-3">
            <h2 id="channel-heading" className="font-serif text-2xl text-ink">
              By channel
            </h2>
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="label px-4 py-2.5 font-normal">Channel</th>
                    {["Posts", "Likes", "Comments", "Enquiries"].map((h) => (
                      <th key={h} className="label px-4 py-2.5 text-right font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {byChannel.map((c) => (
                    <tr key={c.channel}>
                      <td className="px-4 py-2.5 text-ink">{CHANNEL_LABEL[c.channel]}</td>
                      {[c.posts, c.likes, c.comments, c.enquiries].map((n, i) => (
                        <td key={i} className="px-4 py-2.5 text-right text-ink tabular-nums">
                          {n.toLocaleString("en-GB")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </section>

          <section aria-labelledby="posts-heading" className="space-y-3">
            <h2 id="posts-heading" className="font-serif text-2xl text-ink">
              Each post
            </h2>
            <Panel className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="label px-4 py-2.5 font-normal">Published</th>
                    <th className="label px-4 py-2.5 font-normal">Post</th>
                    {["Likes", "Comments", "Enquiries"].map((h) => (
                      <th key={h} className="label px-4 py-2.5 text-right font-normal">
                        {h}
                      </th>
                    ))}
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {current.map((r) => {
                    const res = one(r.post_results);
                    const title = one(r.briefs)?.title || "Untitled brief";
                    const social = r.channel !== "newsletter";
                    const num = (n: number | null | undefined) => (n === null || n === undefined ? "–" : n.toLocaleString("en-GB"));
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDate(r.posted_at, profile.timezone)}</td>
                        <td className="px-4 py-3">
                          <span className="label text-accent">{CHANNEL_LABEL[r.channel]}</span>
                          <Link href={`/briefs/${r.brief_id}?channel=${r.channel}`} className="mt-0.5 block font-serif text-[16px] text-ink hover:underline">
                            {title}
                          </Link>
                          {r.channel === "newsletter" && res?.recipients !== null && res?.recipients !== undefined ? (
                            <span className="block text-xs text-muted">
                              Sent to {res.recipients.toLocaleString("en-GB")} · {res.opens ?? 0} opened · {res.clicks ?? 0} clicked
                            </span>
                          ) : null}
                          {res?.source === "manual" ? (
                            <form action={useAutomaticResults} className="inline">
                              <input type="hidden" name="post_id" value={r.id} />
                              <span className="block text-xs text-muted">
                                Numbers entered by you.{" "}
                                {r.channel !== "linkedin" && r.published_via === "junior" ? (
                                  <button type="submit" className="underline underline-offset-2">
                                    Use automatic numbers
                                  </button>
                                ) : null}
                              </span>
                            </form>
                          ) : res?.fetch_error ? (
                            <span className="block text-xs text-muted">{res.fetch_error}</span>
                          ) : r.published_via === "manual" && social ? (
                            <span className="block text-xs text-muted">Posted by hand, so enter its numbers yourself.</span>
                          ) : null}
                          {r.external_url ? (
                            <a href={r.external_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">
                              View live
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right text-ink tabular-nums">{social ? num(res?.likes) : "–"}</td>
                        <td className="px-4 py-3 text-right text-ink tabular-nums">{social ? num(res?.comments) : "–"}</td>
                        <td className="px-4 py-3 text-right text-ink tabular-nums">{r.post_enquiries.length}</td>
                        <td className="w-64 px-4 py-3">
                          <RowActions
                            postId={r.id}
                            today={today}
                            likes={res?.likes ?? null}
                            comments={res?.comments ?? null}
                            canEditNumbers={social}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}
