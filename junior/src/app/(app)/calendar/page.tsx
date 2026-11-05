import type { Metadata } from "next";
import Link from "next/link";
import { MascotMessage } from "@/components/mascot";
import { ButtonLink, PageHeader } from "@/components/ui";
import { CHANNEL_LABEL } from "@/lib/channels";
import { requireProfile } from "@/lib/dal";
import { calendarItems, type QueueItem } from "@/lib/queries";
import { formatDate, formatTime, isDateKey, mondayOf, shiftWeek, weekDays, zonedDateKey } from "@/lib/time";

export const metadata: Metadata = { title: "Calendar" };

function when(item: QueueItem): string {
  return (item.status === "posted" ? item.posted_at : item.scheduled_for) ?? item.updated_at;
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const profile = await requireProfile();
  const tz = profile.timezone;
  const { week } = await searchParams;
  const todayKey = zonedDateKey(new Date(), tz);
  const monday = mondayOf(typeof week === "string" && isDateKey(week) ? week : todayKey);
  const days = weekDays(monday, tz);
  const items = await calendarItems(days[0].start, days[6].end);

  const byDay = new Map(days.map((d) => [d.key, [] as QueueItem[]]));
  for (const item of items) byDay.get(zonedDateKey(when(item), tz))?.push(item);
  for (const list of byDay.values()) list.sort((a, b) => when(a).localeCompare(when(b)));

  const thisWeek = mondayOf(todayKey) === monday;

  return (
    <div>
      <PageHeader eyebrow="Calendar" title={`Week of ${formatDate(days[0].start, tz)}`}>
        Scheduled and posted items, in {tz === "Asia/Singapore" ? "Singapore" : "Kuala Lumpur"} time.
      </PageHeader>

      <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Weeks">
        <ButtonLink href={`/calendar?week=${shiftWeek(monday, -1)}`} variant="secondary" size="sm">
          Previous week
        </ButtonLink>
        {!thisWeek ? (
          <ButtonLink href="/calendar" variant="ghost" size="sm">
            This week
          </ButtonLink>
        ) : null}
        <ButtonLink href={`/calendar?week=${shiftWeek(monday, 1)}`} variant="secondary" size="sm">
          Next week
        </ButtonLink>
      </nav>

      <div className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line md:grid-cols-7">
        {days.map((day) => {
          const list = byDay.get(day.key) ?? [];
          const today = day.key === todayKey;
          return (
            <section key={day.key} className="min-h-32 bg-bg p-2.5 md:min-h-72" aria-label={day.label}>
              <h2 className={`mb-2 flex items-baseline justify-between ${today ? "text-ink" : "text-muted"}`}>
                <span className={`label ${today ? "text-ink" : ""}`}>
                  {day.label}
                </span>
                {today ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="Today" /> : null}
              </h2>
              <ul className="space-y-2">
                {list.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/briefs/${item.brief_id}?channel=${item.channel}`}
                      className={`block rounded-[3px] border px-2 py-1.5 hover:border-line-strong ${
                        item.status === "posted" ? "border-line bg-sunken" : "border-accent bg-accent-soft"
                      }`}
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="font-mono text-[10.5px] whitespace-nowrap text-ink">{formatTime(when(item), tz)}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">{CHANNEL_LABEL[item.channel]}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink">{item.brief_title}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        {item.status === "posted" ? "Posted" : "Scheduled"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {!items.length ? (
        <div className="mt-8">
          <MascotMessage title="A quiet week">
            Approve a draft and pick a time to see it here. <Link href="/queue" className="text-accent underline underline-offset-4">Open the queue</Link>.
          </MascotMessage>
        </div>
      ) : null}
    </div>
  );
}
