# Junior by Lawgistics

Junior does marketing for lawyers in Malaysia and Singapore. A lawyer pastes a
judgment, rough notes or a voice note, and Junior drafts a LinkedIn post, an
Instagram carousel, a Facebook post and a newsletter piece. The lawyer reviews,
edits and approves each one. Nothing goes out without approval.

This folder is a standalone Next.js app. The N1AMH AI site at the repo root is
separate and unaffected. On Vercel, create a project with **Root Directory**
set to `junior`.

## Status

**Phase 1 (this release):** sign-in, onboarding, drafting, review with checks,
approval log, queue, week calendar, copy buttons. No auto-posting: approved
posts are copied and published by hand, then marked as posted.

- Phase 2: Meta (Facebook Page, Instagram) and LinkedIn connections, encrypted
  tokens, scheduled publishing.
- Phase 3: newsletter sending with Resend, 1080 x 1350 carousel images in the
  lawyer's brand colours, results per post.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack), Tailwind CSS 4
- Supabase: auth (magic link and 6-digit code), Postgres with row level
  security, storage for uploads
- Claude (`claude-opus-5-5`) for drafting, with structured JSON output
- OpenAI speech-to-text for voice notes (Claude does not take audio)
- `unpdf` for PDF text

## How it works

```
Draft screen ──► privacy scan (in the browser) ──► Ask Junior
                     │ strip names, IC/NRIC, phones, emails
                     ▼
            Claude: 4 drafts + 4–6 checks each (JSON)
                     ▼
            House rules run on every draft (and on every edit)
                     ▼
  Review: fix blocking issues, tick off flagged checks ──► Approve (logged)
                     ▼
            Schedule ──► copy and post ──► Mark as posted (logged)
```

### Drafting rules

`src/lib/junior/prompt.ts` holds the system prompt. Claude must use only facts
in the source, write `[placeholders]` for anything missing, use plain language,
short sentences and British spelling, no emojis or em dashes, follow the
publicity guardrails (no "best/leading/specialist" claims, comparisons,
outcome promises, fees or discounts, testimonials or client details) and end
LinkedIn, Facebook and newsletter drafts with a general information line. The
reply is validated against a Zod schema (`schema.ts`).

### Two layers of checks

1. **Junior's checks**: 4 to 6 per draft, written by Claude.
2. **House rules** (`src/lib/guardrails.ts`): deterministic checks that run
   live in the editor and again on the server before approval. They catch
   placeholders, identity numbers, possible names, contact details, publicity
   wording, emojis, em dashes, American spelling, the general information line
   and platform limits. Legal phrases such as "best interests of the child",
   "leading case" and "expert witness" are allowed.

Any failed check blocks approval until it is ticked off. Two kinds cannot be
ticked off and must be fixed in the text: unfilled `[placeholders]` and IC or
NRIC numbers. Emojis, dashes and spelling have a "Fix it for me" button.

### Rules the database enforces

`supabase/migrations/20261105000000_phase1.sql`:

- Every table is private to its owner (row level security).
- Lawyers can edit post text directly, but not status. Approve, schedule, mark
  as posted and tick off are Postgres functions that check the rules.
- Approval is refused while any failed check is still open.
- Editing approved or scheduled text withdraws the approval automatically.
- Posted text cannot be edited.
- `approval_log` records every approval, withdrawal, schedule and tick-off
  with who, when, a SHA-256 fingerprint of the content and, for approvals, a
  copy of exactly what was approved. Users can read it but not write, change
  or delete it.

`supabase/tests/workflow_test.sql` proves each of these (24 pgTAP tests).

### Privacy (PDPA 2010 and PDPA 2012)

- The draft screen scans pasted text for client names, MyKad and NRIC/FIN
  numbers, phone numbers, emails, company names and case titles, and offers to
  replace them with labels like `[Name 1]` before anything leaves the browser.
  The server checks again. Keeping them needs an explicit choice, which is
  recorded on the brief.
- Uploaded PDFs and voice notes go to a private bucket, are read once, and
  are deleted straight away.
- Sign-in links open a confirmation page, so email scanners cannot use up the
  link.
- `/privacy` is a draft notice. Items in [brackets] need Lawgistics' details
  and a review by counsel before launch.
- Social tokens arrive in phase 2 and will be stored encrypted.

## Run it locally

Needs Node 20.9+ and Docker.

```bash
cd junior
npm install
npx supabase start          # prints the API URL and publishable key
cp .env.example .env.local  # fill in the Supabase values
npm run dev
```

Sign-in emails land in Mailpit at http://127.0.0.1:54324.

Without `ANTHROPIC_API_KEY`, set `JUNIOR_DEMO_DRAFTS=1` in `.env.local` to get
placeholder drafts built from your text, so you can click through the flow.
Demo drafts are labelled everywhere and never run in production.

## Tests

```bash
npm test                    # unit tests: privacy scan, house rules, time zones, Claude call (mocked API)
npx supabase test db        # database rules
npm run lint && npm run typecheck
```

## Deploying

1. Create a Supabase project and run the migration (`npx supabase db push`).
2. In Supabase Auth settings, set the Site URL to the app URL and add
   `https://<app>/**` to the redirect URLs.
3. Set the **Magic Link** and **Confirm signup** email templates to the HTML in
   `supabase/templates/magic_link.html` (it links to `/auth/confirm` with a
   token hash and shows the 6-digit code).
4. Set up custom SMTP for auth emails (Resend works). Supabase's built-in
   mailer is rate limited.
5. On Vercel: Root Directory `junior`, and the variables in `.env.example`.
   Drafting can take up to a minute, so the draft route allows 300 seconds.

## Layout

- `src/app/(app)/draft`: draft screen, uploads, Ask Junior
- `src/app/(app)/briefs/[id]`: review, checks, approve, schedule, copy
- `src/app/(app)/queue`, `calendar`, `settings`: queue board, week view,
  profile and approval log
- `src/lib/junior`: prompt, schema, Claude call, demo drafts
- `src/lib/guardrails.ts`, `src/lib/pii.ts`: house rules and the privacy scan
- `src/components/mascot.tsx`: Junior (idle, thinking, happy)
