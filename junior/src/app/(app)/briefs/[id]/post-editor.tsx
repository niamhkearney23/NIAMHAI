"use client";

import { useMemo, useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { MascotMessage } from "@/components/mascot";
import { Badge, Button, Notice, inputClass } from "@/components/ui";
import { CHANNEL_LABEL, PLATFORM_LIMITS, STATUS_LABEL } from "@/lib/channels";
import { applyFix, openChecks, runRuleChecks } from "@/lib/guardrails";
import { formatDateTime } from "@/lib/time";
import type { Card, Check, Post, PostContent, TimeZone } from "@/lib/types";
import {
  approvePost,
  markPosted,
  returnToReview,
  savePost,
  schedulePost,
  tickCheck,
  unschedulePost,
  type PostResult,
} from "../actions";
import { CarouselPreview } from "./carousel-preview";

function sameContent(a: PostContent, b: PostContent) {
  return a.title === b.title && a.body === b.body && JSON.stringify(a.cards) === JSON.stringify(b.cards);
}

export function PostEditor({
  post,
  onChange,
  timezone,
  defaultSchedule,
  firm,
}: {
  post: Post;
  onChange: (post: Post) => void;
  timezone: TimeZone;
  defaultSchedule: string;
  firm: string;
}) {
  const [draft, setDraft] = useState<PostContent>({ title: post.title, body: post.body, cards: post.cards });
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [when, setWhen] = useState(defaultSchedule);
  const [busy, startTransition] = useTransition();

  const saved: PostContent = { title: post.title, body: post.body, cards: post.cards };
  const dirty = !sameContent(draft, saved);
  const editable = post.status !== "posted";
  const approvedLike = post.status === "approved" || post.status === "scheduled";

  const liveRules = useMemo(() => runRuleChecks({ channel: post.channel, ...draft }), [post.channel, draft]);
  const allChecks = [...post.checks, ...liveRules];
  const open = openChecks(allChecks, post.check_acks);

  function run(
    action: () => Promise<PostResult>,
    success?: string,
    { syncText = false, onError }: { syncText?: boolean; onError?: () => void } = {},
  ) {
    setError(null);
    setFlash(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        onError?.();
      }
      if (result.post) {
        onChange(result.post);
        // Only a save replaces what is in the editor; other actions leave edits alone.
        if (syncText) setDraft({ title: result.post.title, body: result.post.body, cards: result.post.cards });
        if (success) setFlash(success);
      }
    });
  }

  // Tick or untick straight away, and undo it if the server says no.
  function tick(key: string, on: boolean) {
    const before = post;
    const acks = { ...post.check_acks };
    if (on) acks[key] = { at: new Date().toISOString(), by: "" };
    else delete acks[key];
    onChange({ ...post, check_acks: acks });
    run(() => tickCheck(post.id, key, on), undefined, { onError: () => onChange(before) });
  }

  const save = () =>
    run(
      () => savePost(post.id, draft),
      approvedLike ? "Saved. The approval was withdrawn because the text changed." : "Saved.",
      { syncText: true },
    );

  function setCard(i: number, patch: Partial<Card>) {
    setDraft((d) => ({ ...d, cards: d.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  }
  function moveCard(i: number, dir: -1 | 1) {
    setDraft((d) => {
      const cards = [...d.cards];
      const j = i + dir;
      if (j < 0 || j >= cards.length) return d;
      [cards[i], cards[j]] = [cards[j], cards[i]];
      return { ...d, cards };
    });
  }

  const copyable = approvedLike || post.status === "posted";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Editor */}
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={post.status === "to_review" ? "plain" : post.status === "posted" ? "ink" : "accent"}>
            {STATUS_LABEL[post.status]}
          </Badge>
          <span className="text-sm text-muted">
            {post.status === "posted" && post.posted_at
              ? `Posted ${formatDateTime(post.posted_at, timezone)}`
              : post.status === "scheduled" && post.scheduled_for
                ? `Scheduled for ${formatDateTime(post.scheduled_for, timezone)}`
                : post.status === "approved" && post.approved_at
                  ? `Approved ${formatDateTime(post.approved_at, timezone)}`
                  : "Review the draft, edit anything, then approve it."}
          </span>
        </div>

        {post.channel === "newsletter" ? (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label htmlFor={`${post.id}-title`} className="label">
                Subject line
              </label>
              <span className="font-mono text-[11px] text-muted">
                {draft.title.length} / {PLATFORM_LIMITS.newsletterSubjectChars}
              </span>
            </div>
            <input
              id={`${post.id}-title`}
              value={draft.title}
              disabled={!editable}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={`${inputClass} font-serif text-lg`}
            />
          </div>
        ) : null}

        {post.channel === "instagram" ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="label">Carousel cards</h3>
              <span className="font-mono text-[11px] text-muted">{draft.cards.length} cards</span>
            </div>
            <CarouselPreview cards={draft.cards} firm={firm} />
            <ol className="space-y-3">
              {draft.cards.map((card, i) => (
                <li key={i} className="rounded-[4px] border border-line bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="label">Card {i + 1}</span>
                    {editable ? (
                      <span className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => moveCard(i, -1)} disabled={i === 0} aria-label={`Move card ${i + 1} up`}>
                          Up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveCard(i, 1)}
                          disabled={i === draft.cards.length - 1}
                          aria-label={`Move card ${i + 1} down`}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDraft((d) => ({ ...d, cards: d.cards.filter((_, j) => j !== i) }))}
                          aria-label={`Remove card ${i + 1}`}
                        >
                          Remove
                        </Button>
                      </span>
                    ) : null}
                  </div>
                  <input
                    aria-label={`Card ${i + 1} heading`}
                    value={card.heading}
                    disabled={!editable}
                    onChange={(e) => setCard(i, { heading: e.target.value })}
                    className={`${inputClass} mb-2 font-serif`}
                  />
                  <textarea
                    aria-label={`Card ${i + 1} text`}
                    value={card.body}
                    disabled={!editable}
                    rows={2}
                    onChange={(e) => setCard(i, { body: e.target.value })}
                    className={`${inputClass} resize-y`}
                  />
                  {copyable ? (
                    <div className="mt-2">
                      <CopyButton text={`${card.heading}\n\n${card.body}`} label={`Copy card ${i + 1}`} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
            {editable && draft.cards.length < 10 ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setDraft((d) => ({ ...d, cards: [...d.cards, { heading: "", body: "" }] }))}>
                Add a card
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label htmlFor={`${post.id}-body`} className="label">
              {post.channel === "instagram" ? "Caption" : post.channel === "newsletter" ? "Body" : "Post"}
            </label>
            <span className="font-mono text-[11px] text-muted">
              {draft.body.length.toLocaleString("en-GB")}
              {post.channel === "linkedin" ? ` / ${PLATFORM_LIMITS.linkedinChars.toLocaleString("en-GB")}` : ""}
              {post.channel === "instagram" ? ` / ${PLATFORM_LIMITS.instagramCaptionChars.toLocaleString("en-GB")}` : ""}
            </span>
          </div>
          <textarea
            id={`${post.id}-body`}
            value={draft.body}
            disabled={!editable}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={post.channel === "newsletter" ? 22 : post.channel === "instagram" ? 6 : 14}
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>

        {editable ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={save} disabled={!dirty || busy} variant={dirty ? "primary" : "secondary"}>
              {busy && dirty ? "Saving" : dirty ? "Save changes" : "Saved"}
            </Button>
            {dirty ? (
              <Button type="button" variant="ghost" onClick={() => setDraft(saved)} disabled={busy}>
                Undo changes
              </Button>
            ) : null}
            {dirty && approvedLike ? (
              <span className="text-sm text-danger">Saving will withdraw your approval. You will need to approve it again.</span>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 border-t border-line pt-5">
          <h3 className="label">Copy</h3>
          {copyable ? (
            <div className="flex flex-wrap gap-2">
              {post.channel === "newsletter" ? <CopyButton text={post.title} label="Copy subject" /> : null}
              <CopyButton
                text={post.body}
                label={post.channel === "instagram" ? "Copy caption" : post.channel === "newsletter" ? "Copy body" : `Copy ${CHANNEL_LABEL[post.channel]} post`}
                variant="primary"
              />
              {post.channel === "instagram" ? (
                <CopyButton text={post.cards.map((c, i) => `${i + 1}. ${c.heading}\n${c.body}`).join("\n\n")} label="Copy all cards" />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">Copy buttons unlock once you approve this post.</p>
          )}
        </div>
      </div>

      {/* Checks and approval */}
      <aside className="space-y-6">
        <CheckList
          title="Junior's checks"
          checks={post.checks}
          post={post}
          dirty={dirty}
          busy={busy}
          onTick={tick}
        />
        <CheckList
          title="House rules"
          checks={liveRules}
          post={post}
          dirty={dirty}
          busy={busy}
          collapsePassed
          onTick={tick}
          onFix={(fix) => setDraft((d) => applyFix(d, fix))}
          stored={post.rule_checks}
        />

        <section className="space-y-4 rounded-[4px] border border-line-strong p-4">
          {post.status === "to_review" ? (
            <>
              <h3 className="font-serif text-lg text-ink">Approve</h3>
              <p className="text-sm text-ink-2">
                {dirty
                  ? "Save your changes first."
                  : open.length
                    ? `Fix or tick off ${open.length} check${open.length === 1 ? "" : "s"} first.`
                    : "Everything is checked. Approving logs your name and the time."}
              </p>
              <Button type="button" className="w-full" disabled={dirty || open.length > 0 || busy} onClick={() => run(() => approvePost(post.id), "approved")}>
                Approve {CHANNEL_LABEL[post.channel]} {post.channel === "instagram" ? "carousel" : post.channel === "newsletter" ? "piece" : "post"}
              </Button>
            </>
          ) : null}

          {flash === "approved" && post.status === "approved" ? (
            <MascotMessage mood="happy" title="Approved" size={44}>
              Logged with your name and the time. Pick when it should go out.
            </MascotMessage>
          ) : null}

          {approvedLike ? (
            <>
              <h3 className="font-serif text-lg text-ink">{post.status === "scheduled" ? "Scheduled" : "When should it go out?"}</h3>
              {post.status === "scheduled" && post.scheduled_for ? (
                <p className="text-sm text-ink-2">{formatDateTime(post.scheduled_for, timezone)}</p>
              ) : null}
              <div className="space-y-2">
                <label htmlFor={`${post.id}-when`} className="label">
                  {post.status === "scheduled" ? "Change time" : "Date and time"} ({timezone === "Asia/Singapore" ? "Singapore" : "Kuala Lumpur"})
                </label>
                <input
                  id={`${post.id}-when`}
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className={inputClass}
                />
                <Button type="button" className="w-full" disabled={busy || dirty || !when} onClick={() => run(() => schedulePost(post.id, when), "scheduled")}>
                  {post.status === "scheduled" ? "Reschedule" : "Schedule"}
                </Button>
              </div>
              <p className="text-xs text-muted">
                Auto-posting arrives once your accounts are connected. For now, copy the post and publish it at this time,
                then mark it as posted.
              </p>
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button type="button" size="sm" variant="secondary" disabled={busy || dirty} onClick={() => run(() => markPosted(post.id), "posted")}>
                  Mark as posted
                </Button>
                {post.status === "scheduled" ? (
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run(() => unschedulePost(post.id))}>
                    Unschedule
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run(() => returnToReview(post.id))}>
                  Withdraw approval
                </Button>
              </div>
            </>
          ) : null}

          {post.status === "posted" ? (
            <MascotMessage mood="happy" title="Posted" size={44}>
              {post.posted_at ? formatDateTime(post.posted_at, timezone) : null}. Junior keeps this version on record.
            </MascotMessage>
          ) : null}

          {error ? <Notice tone="danger">{error}</Notice> : null}
          {flash && flash !== "approved" && flash !== "posted" && flash !== "scheduled" ? <Notice tone="accent">{flash}</Notice> : null}
          {flash === "scheduled" && post.status === "scheduled" ? <Notice tone="accent">Scheduled. It is on your calendar.</Notice> : null}
        </section>
      </aside>
    </div>
  );
}

function CheckIcon({ pass, blocking }: { pass: boolean; blocking?: boolean }) {
  return pass ? (
    <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 text-accent" aria-label="Passed">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.8 8.3 7 10.5l4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 text-danger" aria-label={blocking ? "Must fix" : "Needs a look"}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5v4.2M8 11v.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckList({
  title,
  checks,
  post,
  dirty,
  busy,
  onTick,
  onFix,
  collapsePassed,
  stored,
}: {
  title: string;
  checks: Check[];
  post: Post;
  dirty: boolean;
  busy: boolean;
  onTick: (key: string, on: boolean) => void;
  onFix?: (fix: NonNullable<Check["fix"]>) => void;
  collapsePassed?: boolean;
  /** For live checks: what the server has, so we know if ticking is possible yet. */
  stored?: Check[];
}) {
  const failed = checks.filter((c) => !c.pass);
  const passed = checks.filter((c) => c.pass);
  const inReview = post.status === "to_review";

  function row(c: Check) {
    const ticked = c.key in post.check_acks;
    const storedFail = stored ? stored.some((s) => s.key === c.key && !s.pass) : true;
    return (
      <li key={c.key} className="flex gap-2.5 py-2.5">
        <CheckIcon pass={c.pass} blocking={c.blocking} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">{c.item}</p>
          <p className="text-[13px] leading-snug text-ink-2">{c.note}</p>
          {!c.pass ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {c.blocking ? (
                <span className="label text-danger">Must be fixed in the text</span>
              ) : (
                <label className={`flex items-center gap-2 text-[13px] ${inReview ? "cursor-pointer text-ink" : "text-muted"}`}>
                  <input
                    type="checkbox"
                    checked={ticked}
                    disabled={!inReview || busy || (!ticked && (dirty || !storedFail))}
                    onChange={(e) => onTick(c.key, e.target.checked)}
                    className="accent-[var(--ink)]"
                  />
                  {ticked ? "Ticked off" : dirty || !storedFail ? "Save, then tick off" : "I have checked this"}
                </label>
              )}
              {c.fix && onFix && post.status !== "posted" ? (
                <button type="button" onClick={() => onFix(c.fix!)} className="text-[13px] text-accent underline underline-offset-4">
                  Fix it for me
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="label">{title}</h3>
        <span className="font-mono text-[11px] text-muted">
          {passed.length}/{checks.length} passed
        </span>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {failed.map(row)}
        {!collapsePassed ? passed.map(row) : null}
      </ul>
      {collapsePassed && passed.length ? (
        <details className="group">
          <summary className="cursor-pointer py-2 text-[13px] text-muted hover:text-ink">
            {passed.length} rule{passed.length === 1 ? "" : "s"} passed
          </summary>
          <ul className="divide-y divide-line border-b border-line">{passed.map(row)}</ul>
        </details>
      ) : null}
    </section>
  );
}
