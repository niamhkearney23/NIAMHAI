import type { Metadata } from "next";
import { BrandForm } from "@/components/brand-form";
import { ConnectionsPanel } from "@/components/connections-panel";
import { InboundPanel, type InboundRow } from "@/components/inbound-panel";
import { ProfileForm } from "@/components/profile/profile-form";
import { ButtonLink, PageHeader, Panel } from "@/components/ui";
import { listConnections } from "@/lib/connections";
import { CHANNEL_LABEL } from "@/lib/channels";
import { brandOf, requireProfile, requireUser } from "@/lib/dal";
import { inboundAddress } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import type { ApprovalLogEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

const ACTION_LABEL: Record<ApprovalLogEntry["action"], string> = {
  approved: "Approved",
  approval_revoked: "Approval withdrawn",
  scheduled: "Scheduled",
  unscheduled: "Unscheduled",
  marked_posted: "Marked as posted",
  publish_requested: "Asked to publish",
  published: "Published by Junior",
  publish_failed: "Publishing failed",
  check_ticked: "Ticked off a check",
  check_unticked: "Unticked a check",
};

function detailText(entry: ApprovalLogEntry, tz: string): string {
  const d = entry.detail as Record<string, unknown>;
  if (entry.action === "scheduled" && typeof d.scheduled_for === "string") return `for ${formatDateTime(d.scheduled_for, tz)}`;
  if (entry.action === "approval_revoked" && typeof d.reason === "string") return d.reason;
  if (entry.action === "publish_failed" && typeof d.error === "string") return `${d.error}${d.will_retry ? " Retrying." : ""}`;
  if (entry.action === "publish_requested") return d.when === "retry" ? "Retry" : "Publish now";
  if ((entry.action === "check_ticked" || entry.action === "check_unticked") && d.check && typeof d.check === "object") {
    return String((d.check as { item?: string }).item ?? "");
  }
  if (entry.action === "approved" && Array.isArray(d.ticked_off_checks) && d.ticked_off_checks.length) {
    return `${d.ticked_off_checks.length} flagged check${d.ticked_off_checks.length === 1 ? "" : "s"} ticked off`;
  }
  return "";
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const profile = await requireProfile();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const connections = await listConnections();
  const supabase = await createClient();
  const address = inboundAddress();
  const user = address ? await requireUser() : null;
  const { data: inbound } = address
    ? await supabase
        .from("inbound_messages")
        .select("id, status, reason, brief_id, redactions, received_at")
        .order("received_at", { ascending: false })
        .limit(8)
    : { data: null };
  const { data: log } = await supabase
    .from("approval_log")
    .select("id, post_id, actor_email, action, channel, content_hash, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-14">
      <PageHeader eyebrow="Settings" title={one(params.welcome) ? "Connect your accounts" : "Settings"}>
        {one(params.welcome)
          ? "Connect the accounts Junior should publish to. You can do this later, and you can still copy any post by hand."
          : "Your accounts, your details and the approval log."}
      </PageHeader>

      <section id="connections" aria-labelledby="connections-heading" className="max-w-2xl scroll-mt-8 space-y-4">
        <h2 id="connections-heading" className="font-serif text-2xl text-ink">
          Accounts
        </h2>
        <ConnectionsPanel
          connections={connections}
          timezone={profile.timezone}
          connected={one(params.connected)}
          error={one(params.connect_error)}
          errorProvider={one(params.provider)}
        />
        {one(params.welcome) ? (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <ButtonLink href="/draft">Start drafting</ButtonLink>
            <span className="text-sm text-muted">You can come back here any time from Settings.</span>
          </div>
        ) : null}
      </section>

      {address && user ? (
        <section id="email" aria-labelledby="email-heading" className="max-w-2xl scroll-mt-8 space-y-4">
          <h2 id="email-heading" className="font-serif text-2xl text-ink">
            Email Junior
          </h2>
          <InboundPanel address={address} signInEmail={user.email ?? ""} rows={(inbound ?? []) as InboundRow[]} timezone={profile.timezone} />
        </section>
      ) : null}

      <section aria-labelledby="newsletter-heading" className="max-w-2xl space-y-3">
        <h2 id="newsletter-heading" className="font-serif text-2xl text-ink">
          Newsletter
        </h2>
        <p className="text-[15px] text-ink-2">
          {profile.newsletter_enabled
            ? "On. Approved newsletter pieces are emailed to your subscribers at the time you pick."
            : "Off. Set up your sender details and subscribers to have Junior email approved newsletters."}
        </p>
        <ButtonLink href="/settings/newsletter" variant="secondary" size="sm">
          Newsletter and subscribers
        </ButtonLink>
      </section>

      <section id="brand" aria-labelledby="brand-heading" className="max-w-2xl scroll-mt-8 space-y-4">
        <h2 id="brand-heading" className="font-serif text-2xl text-ink">
          Carousel colours
        </h2>
        <p className="text-[15px] text-ink-2">
          Instagram cards are drawn in these colours at 1080 by 1350 pixels. Junior picks a readable text colour for each.
        </p>
        <BrandForm initial={brandOf(profile)} firm={profile.firm} />
      </section>

      <section aria-labelledby="details-heading" className="max-w-2xl space-y-4">
        <h2 id="details-heading" className="font-serif text-2xl text-ink">
          Your details
        </h2>
        <p className="text-[15px] text-ink-2">Junior uses these to draft in your voice. Changes apply to new briefs.</p>
        <ProfileForm profile={profile} mode="settings" />
      </section>

      <section aria-labelledby="log-heading" className="space-y-4">
        <div>
          <h2 id="log-heading" className="font-serif text-2xl text-ink">
            Approval log
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            Every approval, schedule, ticked-off check and publish, with who did it and when. Entries cannot be edited or
            deleted.
          </p>
        </div>
        <Panel className="overflow-x-auto">
          {log?.length ? (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {["When", "Who", "What", "Channel", "Detail", "Fingerprint"].map((h) => (
                    <th key={h} className="label px-4 py-2.5 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(log as ApprovalLogEntry[]).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">{formatDateTime(entry.created_at, profile.timezone)}</td>
                    <td className="px-4 py-2.5 text-ink-2">{entry.actor_email}</td>
                    <td className="px-4 py-2.5 text-ink">{ACTION_LABEL[entry.action]}</td>
                    <td className="px-4 py-2.5 text-ink-2">{entry.channel ? CHANNEL_LABEL[entry.channel] : ""}</td>
                    <td className="px-4 py-2.5 text-ink-2">{detailText(entry, profile.timezone)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted" title={entry.content_hash ?? ""}>
                      {entry.content_hash?.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">Nothing logged yet. Approvals will appear here.</p>
          )}
        </Panel>
      </section>
    </div>
  );
}
