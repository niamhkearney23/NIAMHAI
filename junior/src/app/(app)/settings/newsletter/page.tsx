import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { buttonClass, PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/dal";
import { siteUrl } from "@/lib/env";
import { resendConfigured } from "@/lib/newsletter/resend";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { deleteSubscriber, unsubscribeSubscriber } from "./actions";
import { AddSubscribersForm, NewsletterSettingsForm } from "./forms";

export const metadata: Metadata = { title: "Newsletter" };

const STATUS: Record<string, string> = {
  pending: "Waiting to confirm",
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Marked as spam",
};
const SOURCE: Record<string, string> = { manual: "Added by you", import: "Imported by you", signup: "Signed up and confirmed" };

export default async function NewsletterSettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("id, email, name, status, consent_source, consent_note, consented_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const list = subscribers ?? [];
  const active = list.filter((s) => s.status === "subscribed").length;
  const signupUrl = profile.newsletter_slug ? `${siteUrl()}/subscribe/${profile.newsletter_slug}` : null;

  return (
    <div className="space-y-14">
      <PageHeader eyebrow="Settings" title="Newsletter">
        Junior emails approved newsletter pieces to your subscribers through Resend. Everyone gets an unsubscribe link, and
        Junior keeps a record of how each person agreed.{" "}
        <Link href="/settings" className="text-accent underline underline-offset-4">
          Back to settings
        </Link>
      </PageHeader>

      <section className="max-w-2xl space-y-4" aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="font-serif text-2xl text-ink">
          Sending
        </h2>
        <NewsletterSettingsForm
          available={resendConfigured()}
          initial={{
            enabled: profile.newsletter_enabled,
            fromName: profile.newsletter_from_name || profile.firm,
            replyTo: profile.newsletter_reply_to,
            footer: profile.newsletter_footer,
          }}
        />
      </section>

      {signupUrl && profile.newsletter_enabled ? (
        <section className="max-w-2xl space-y-3" aria-labelledby="signup-heading">
          <h2 id="signup-heading" className="font-serif text-2xl text-ink">
            Sign-up page
          </h2>
          <p className="text-[15px] text-ink-2">
            Share this link on your website or email signature. New subscribers confirm by email before Junior sends them
            anything.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-[3px] border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">{signupUrl}</code>
            <CopyButton text={signupUrl} label="Copy link" />
          </div>
        </section>
      ) : null}

      <section className="max-w-2xl space-y-4" aria-labelledby="add-heading">
        <h2 id="add-heading" className="font-serif text-2xl text-ink">
          Add subscribers
        </h2>
        <p className="text-[15px] text-ink-2">
          Only add people who agreed to hear from you. Under Malaysia&apos;s and Singapore&apos;s data protection laws you
          need their consent, and they can withdraw it at any time.
        </p>
        <AddSubscribersForm />
      </section>

      <section className="space-y-4" aria-labelledby="list-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="list-heading" className="font-serif text-2xl text-ink">
            Subscribers
          </h2>
          <span className="font-mono text-[12px] text-muted">
            {active} subscribed · {list.length} in total
          </span>
        </div>
        <Panel className="overflow-x-auto">
          {list.length ? (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {["Email", "Name", "Status", "How they agreed", "Since", ""].map((h) => (
                    <th key={h} className="label px-4 py-2.5 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-ink">{s.email}</td>
                    <td className="px-4 py-2.5 text-ink-2">{s.name}</td>
                    <td className={`px-4 py-2.5 ${s.status === "subscribed" ? "text-accent" : "text-muted"}`}>{STATUS[s.status]}</td>
                    <td className="px-4 py-2.5 text-ink-2">
                      {SOURCE[s.consent_source]}
                      {s.consent_note ? <span className="block text-xs text-muted">{s.consent_note}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-2">{formatDate(s.consented_at ?? s.created_at, profile.timezone)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {s.status === "subscribed" ? (
                          <form action={unsubscribeSubscriber}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" className={buttonClass("ghost", "sm")}>
                              Unsubscribe
                            </button>
                          </form>
                        ) : null}
                        <form action={deleteSubscriber}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className={buttonClass("ghost", "sm")} title="Remove them and their consent record">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">No subscribers yet.</p>
          )}
        </Panel>
      </section>
    </div>
  );
}
