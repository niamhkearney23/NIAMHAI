import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { Mascot } from "@/components/mascot";
import { Badge, ButtonLink, Notice, Panel } from "@/components/ui";
import type { SampleDraft } from "@/lib/junior/sample";
import { isStaleRun } from "@/lib/samples";
import { createAdminClient } from "@/lib/supabase/admin";
import { Refresher } from "./refresher";
import { StartForm } from "./start-form";

export const metadata: Metadata = { title: "Your free draft" };
// Writing the draft happens inside the button's request and can take a minute.
export const maxDuration = 300;

const shell = "mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-6 px-5 py-12";

export default async function SamplePage({ params }: PageProps<"/try/confirm/[token]">) {
  const { token } = await params;
  const { data: row } = /^[0-9a-f]{48}$/.test(token)
    ? await createAdminClient()
        .from("sample_requests")
        .select("status, error, attempts, redactions, draft, source_text, updated_at")
        .eq("token", token)
        .maybeSingle()
    : { data: null };

  if (!row) {
    return (
      <main className={shell}>
        <Mascot size={56} />
        <h1 className="font-serif text-4xl text-ink">This link has expired</h1>
        <p className="text-[15px] text-ink-2">Free drafts are kept for 30 days. You can ask for a new one from the sample page.</p>
        <ButtonLink href="/try" variant="secondary">
          Back to the sample page
        </ButtonLink>
      </main>
    );
  }

  const status = row.status === "drafting" && isStaleRun(row.updated_at) ? "failed" : row.status;

  if (status === "drafted") {
    const draft = row.draft as SampleDraft | null;
    if (!draft) {
      return (
        <main className={shell}>
          <Mascot size={56} />
          <h1 className="font-serif text-4xl text-ink">This draft has been deleted</h1>
          <p className="text-[15px] text-ink-2">Junior keeps free drafts for 30 days. Sign up to write and keep your own.</p>
          <ButtonLink href="/login">Sign up</ButtonLink>
        </main>
      );
    }
    return <Result draft={draft} redactions={row.redactions} />;
  }

  if (status === "drafting") {
    return (
      <main className={shell}>
        <Mascot mood="thinking" size={56} />
        <h1 className="font-serif text-4xl text-ink">Junior is writing</h1>
        <p className="text-[15px] text-ink-2">This page updates by itself. It takes up to a minute, and the draft is also emailed to you.</p>
        <Refresher />
      </main>
    );
  }

  if (status === "failed" && row.attempts >= 3) {
    return (
      <main className={shell}>
        <Mascot size={56} />
        <h1 className="font-serif text-4xl text-ink">Junior could not write this one</h1>
        <p className="text-[15px] text-ink-2">{row.error || "Something went wrong."} It has been tried three times. Send a shorter extract from the sample page.</p>
        <ButtonLink href="/try" variant="secondary">
          Back to the sample page
        </ButtonLink>
      </main>
    );
  }

  const chars = row.source_text?.length ?? 0;
  return (
    <main className={shell}>
      <Mascot size={56} />
      <h1 className="font-serif text-4xl text-ink">{status === "failed" ? "That did not work" : "Ready when you are"}</h1>
      {status === "failed" && row.error ? <Notice tone="danger">{row.error}</Notice> : null}
      <p className="text-[15px] text-ink-2">
        Junior has your text ({chars.toLocaleString("en-GB")} characters
        {row.redactions ? `, with ${row.redactions} personal detail${row.redactions === 1 ? "" : "s"} removed` : ""}). Press the button and it
        writes one LinkedIn post from it. This takes up to a minute.
      </p>
      <StartForm token={token} label={status === "failed" ? "Try again" : "Write my draft"} />
    </main>
  );
}

function Result({ draft, redactions }: { draft: SampleDraft; redactions: number }) {
  const failed = draft.checks.filter((c) => !c.pass);
  const passed = draft.checks.filter((c) => c.pass);
  const row = (c: SampleDraft["checks"][number]) => (
    <li key={c.key} className="flex items-start justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-[15px] text-ink">{c.item}</p>
        <p className="text-sm text-ink-2">{c.note}</p>
      </div>
      <Badge tone={c.pass ? "accent" : "danger"}>{c.pass ? "Passed" : "Look closely"}</Badge>
    </li>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-5 py-12">
      <div className="flex items-end gap-4">
        <Mascot mood="happy" size={56} />
        <div>
          <p className="label">Your free draft</p>
          <h1 className="font-serif text-3xl leading-tight text-ink">{draft.title || "LinkedIn post"}</h1>
        </div>
      </div>
      <p className="text-[15px] text-ink-2">
        One LinkedIn post, written from the text you sent
        {redactions ? `, after ${redactions} personal detail${redactions === 1 ? "" : "s"} were removed` : ""}. We have also emailed it to you.
      </p>

      <section aria-label="Draft" className="space-y-3">
        <Panel className="p-5">
          <p className="whitespace-pre-wrap text-[16px] leading-relaxed text-ink">{draft.body}</p>
        </Panel>
        <CopyButton text={draft.body} label="Copy the post" />
      </section>

      <section aria-labelledby="checks-heading" className="space-y-3">
        <h2 id="checks-heading" className="font-serif text-2xl text-ink">
          What Junior checked
        </h2>
        <Panel>
          {failed.length ? <ul className="divide-y divide-line">{failed.map(row)}</ul> : null}
          {passed.length ? (
            <details className={failed.length ? "border-t border-line" : ""}>
              <summary className="cursor-pointer px-4 py-3 text-sm text-ink-2">
                {passed.length} check{passed.length === 1 ? "" : "s"} passed. Show them.
              </summary>
              <ul className="divide-y divide-line border-t border-line">{passed.map(row)}</ul>
            </details>
          ) : null}
        </Panel>
        <p className="text-sm text-muted">
          In Junior, anything marked &ldquo;Look closely&rdquo; has to be fixed or ticked off before you can approve a post.
        </p>
      </section>

      <Notice>This is a first draft. Check every fact against your source before you use it.</Notice>

      <Panel className="flex flex-col items-start gap-4 p-6">
        <h2 className="font-serif text-2xl text-ink">Want to edit it, approve it and schedule it?</h2>
        <p className="text-[15px] text-ink-2">
          With an account, Junior also writes the Instagram, Facebook and newsletter versions, in your own voice, and publishes
          after you approve.
        </p>
        <ButtonLink href="/login">Sign up with this email address</ButtonLink>
      </Panel>
    </main>
  );
}
