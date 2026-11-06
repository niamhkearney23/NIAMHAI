# Junior by Lawgistics

Junior does marketing for lawyers in Malaysia and Singapore. A lawyer pastes a
judgment, rough notes or a voice note, and Junior drafts a LinkedIn post, an
Instagram carousel, a Facebook post and a newsletter piece. The lawyer reviews,
edits and approves each one. Nothing goes out without approval.

This folder is a standalone Next.js app. The N1AMH AI site at the repo root is
separate and unaffected. On Vercel, create a project with **Root Directory**
set to `junior`.

## Status

- **Phase 1:** sign-in, onboarding, drafting, review with checks, approval
  log, queue, week calendar, copy buttons.
- **Phase 2 (this release):** Facebook Page, Instagram and LinkedIn
  connections with encrypted tokens, scheduled publishing, publish now, retries.
  Instagram carousels are rendered as 1080 x 1350 JPEGs in Lawgistics colours.
- Phase 3: newsletter sending with Resend, a carousel builder in the lawyer's
  own brand colours, results per post. Until then newsletters are copied by
  hand.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack), Tailwind CSS 4
- Supabase: auth (magic link and 6-digit code), Postgres with row level
  security, storage for uploads
- Claude (`claude-opus-5-5`) for drafting, with structured JSON output
- OpenAI speech-to-text for voice notes (Claude does not take audio)
- `unpdf` for PDF text
- Meta Graph API (v26.0) for Facebook Page posts and Instagram carousels
- LinkedIn Posts API for member posts
- `next/og` and `sharp` to render carousel cards
- Supabase `pg_cron` and `pg_net` to wake the publisher every minute

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

### Connections and publishing

- **Connecting:** Facebook Login (with a Page picker when the lawyer manages
  several Pages; the Page's linked Instagram professional account comes with
  it) and LinkedIn sign-in. A random state value in an httpOnly cookie ties
  each callback to the browser that started it.
- **Tokens:** encrypted with AES-256-GCM (`src/lib/crypto.ts`) using
  `TOKEN_ENCRYPTION_KEY`, bound to the owner and provider so a ciphertext
  cannot be moved to another row. The token columns cannot be read by
  signed-in users at all; only the server's secret key can. Tokens never reach
  the browser.
- **Publishing:** every minute, `pg_cron` checks for due posts and, if there
  are any, calls `/api/cron/publish` with `CRON_SECRET`. The publisher claims
  due posts with a row lock (`claim_due_posts`), so nothing goes out twice, and
  only claims posts whose text still matches the approved fingerprint.
- **Failures:** outages are retried after 2, 4, 8 and 16 minutes. An expired
  token marks the account as needing a reconnect. A publish that never
  finished is not retried automatically, because it may already be live; the
  lawyer checks and retries by hand.
- **Logging:** "Asked to publish", "Published by Junior" (with the live link)
  and "Publishing failed" join the approval log.

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
- Social tokens are stored encrypted and are never readable from the browser.

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

Without an Anthropic key, set `JUNIOR_DEMO_DRAFTS=1` in `.env.local` to get
placeholder drafts built from your text, so you can click through the flow.
Demo drafts are labelled everywhere and never run in production. The key can
be `ANTHROPIC_API_KEY` or `JUNIOR_ANTHROPIC_API_KEY` (use the second on a
machine where another tool already uses the first).

### Publishing locally without real apps

`scripts/mock-platforms.mjs` stands in for Facebook Login, the Graph API,
LinkedIn sign-in and the Posts API, and shows what was "published" at
http://localhost:4010/__mock/feed.

```bash
node scripts/mock-platforms.mjs
```

Then in `.env.local`: `META_APP_ID=mock-app`, `META_APP_SECRET=mock-secret`,
`LINKEDIN_CLIENT_ID=mock-client`, `LINKEDIN_CLIENT_SECRET=mock-secret`, and
`META_GRAPH_URL`, `META_DIALOG_URL`, `LINKEDIN_API_URL`, `LINKEDIN_OAUTH_URL`
all set to `http://localhost:4010`. Add `SUPABASE_SECRET_KEY` (printed by
`supabase start`), a `TOKEN_ENCRYPTION_KEY` and a `CRON_SECRET`. To let the
local database wake the publisher:

```sql
select vault.create_secret('http://host.docker.internal:3000/api/cron/publish', 'junior_publish_url');
select vault.create_secret('<CRON_SECRET>', 'junior_cron_secret');
```

and run the dev server with `npx next dev -H 0.0.0.0`.

## Tests

```bash
npm test                    # 45 unit tests: privacy scan, house rules, time zones, encryption,
                            # card rendering, Claude call and Meta/LinkedIn clients (mocked APIs)
npx supabase test db        # 46 database tests: approvals, publishing, token privacy
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
   Drafting and publishing can take up to a minute, so those routes allow 300
   seconds.
6. **Meta app** (developers.facebook.com): a Business app with Facebook Login
   for Business. Redirect URI `https://<app>/api/connect/meta/callback`.
   Permissions: `pages_show_list`, `pages_read_engagement`,
   `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`,
   `business_management`. With Facebook Login for Business, create a
   configuration with those permissions and set `META_LOGIN_CONFIG_ID`.
   Until App Review approves them, only people with a role on the app can
   connect. Business verification is usually required.
7. **LinkedIn app** (linkedin.com/developers): add "Sign In with LinkedIn
   using OpenID Connect" and "Share on LinkedIn". Redirect URI
   `https://<app>/api/connect/linkedin/callback`. LinkedIn tokens last 60
   days; Junior shows the date and asks the lawyer to reconnect.
8. **The publisher:** in the Supabase SQL editor, store the app URL and
   `CRON_SECRET` in Vault (the two `vault.create_secret` lines above, with the
   live URL). The migration already schedules the job. On Vercel Pro you can
   use Vercel Cron on `/api/cron/publish` instead.

## Layout

- `src/app/(app)/draft`: draft screen, uploads, Ask Junior
- `src/app/(app)/briefs/[id]`: review, checks, approve, schedule, copy
- `src/app/(app)/queue`, `calendar`, `settings`: queue board, week view,
  profile and approval log
- `src/lib/junior`: prompt, schema, Claude call, demo drafts
- `src/lib/guardrails.ts`, `src/lib/pii.ts`: house rules and the privacy scan
- `src/lib/platforms`: Meta and LinkedIn clients; `src/lib/connections.ts`:
  encrypted token storage; `src/lib/publish`: publisher and card renderer
- `src/app/api/connect`, `src/app/api/cron/publish`: OAuth and the publisher
- `scripts/mock-platforms.mjs`: local stand-in for Meta and LinkedIn
- `src/components/mascot.tsx`: Junior (idle, thinking, happy)
