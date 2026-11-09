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
- **Phase 2:** Facebook Page, Instagram and LinkedIn connections with
  encrypted tokens, scheduled publishing, publish now, retries.
- **Phase 3 (this release):** newsletter sending with Resend (subscribers with
  consent records, a public sign-up page with email confirmation, one-click
  unsubscribe, delivery tracking), a carousel builder in each lawyer's brand
  colours with image downloads, and results per post.

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

### Newsletter

- **Subscribers** live in Junior with a consent record: added by the lawyer
  (who confirms they agreed and notes how), imported, or signed up on the
  lawyer's public page (`/subscribe/<slug>`) and confirmed by email. A lawyer
  cannot resubscribe someone who unsubscribed; only that person can.
- **Sending** goes through the same publisher as social posts. Each recipient
  gets a send row before anything is sent, and each batch of 100 carries an
  idempotency key, so a retry never emails anyone twice.
- **Every email** has a plain-text part, the lawyer's footer, an unsubscribe
  link and `List-Unsubscribe` one-click headers (`/api/unsubscribe/<token>`).
- **Resend webhooks** (`/api/webhooks/resend`, Svix signatures checked) record
  deliveries, opens and clicks. Bounces and spam complaints stop future sends.

### Free sample (`/try`)

Someone with no account pastes an extract, picks Malaysia or Singapore and gives
an email address. Junior writes one LinkedIn post, with the same facts, style
and publicity rules and the same two layers of checks as a full draft.

- **Nothing is written until the link in the email is opened and a button is
  pressed**, so nobody can spend Junior's money, or fill someone else's inbox,
  by typing in an address. The button (not the link) starts the draft because
  email scanners open links.
- **One per person.** `email_key` folds `+tags` and Gmail dots together. A second
  request gets the same on-screen answer, and an email saying the sample is used.
- **Personal details are stripped first**, with the usual defaults (IC numbers,
  phone numbers, emails, likely names), before anything is stored or sent to
  Claude. The pasted text is deleted once the draft is written. The draft is
  kept 30 days. Unfinished requests go after 3 days. The email is kept 90 days
  unless the person agreed to hear from Junior (`purge_samples`, nightly).
- **Spend brakes:** `JUNIOR_SAMPLES_PER_DAY` (default 30, counted over 24 hours),
  5 requests per network per hour, 100 in total per hour, a hidden honeypot
  field, and `JUNIOR_SAMPLES=off` to close it. Everything sits behind
  `sample_requests`, which only the server can touch (no policies).
- A run that dies part-way can be retaken after 6 minutes, three tries at most.
  `claim_sample` lets exactly one request win, so a double click writes one draft.

### Carousel builder

Settings has three colours (first card, other cards, accent) with a live
preview. Junior picks a readable text colour for each background and warns
when contrast is low. Cards are rendered at 1080 x 1350 for publishing and can
be downloaded as JPEGs (a zip) once approved.

### Results

- Likes, comments and shares come from the Graph API for Facebook and
  Instagram, refreshed hourly (`/api/cron/results`, scheduled by the migration)
  or with "Refresh now".
- LinkedIn only shares post activity with apps it approves for member social
  data, so the lawyer enters those numbers by hand. Hand-entered numbers are
  never overwritten.
- Newsletters show recipients, opens and clicks from the send records.
- Enquiries are logged by the lawyer per post, with a short note that is
  checked for names and contact details.

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
- The public sign-up page gives the same answer whether or not an address is
  already subscribed, so it cannot reveal who follows which firm, and it sends
  at most 30 confirmation emails per firm per hour.
- Every Graph API call carries an `appsecret_proof`, so a leaked Meta token is
  useless without the app secret. Turn on "Require App Secret" in the Meta app.
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
`LINKEDIN_CLIENT_ID=mock-client`, `LINKEDIN_CLIENT_SECRET=mock-secret`,
`RESEND_API_KEY=re_mock`, `NEWSLETTER_FROM_DOMAIN=news.junior.test`, and
`META_GRAPH_URL`, `META_DIALOG_URL`, `LINKEDIN_API_URL`, `LINKEDIN_OAUTH_URL`,
`RESEND_API_URL` all set to `http://localhost:4010`. Emails Junior sends show
on the mock's feed page too. Add `SUPABASE_SECRET_KEY` (printed by
`supabase start`), a `TOKEN_ENCRYPTION_KEY` and a `CRON_SECRET`. To let the
local database wake the publisher:

```sql
select vault.create_secret('http://host.docker.internal:3000/api/cron/publish', 'junior_publish_url');
select vault.create_secret('<CRON_SECRET>', 'junior_cron_secret');
```

and run the dev server with `npx next dev -H 0.0.0.0`.

## Tests

GitHub Actions (`.github/workflows/junior.yml`) runs lint, types, unit tests,
a build and the database tests on every push that touches `junior/`.

```bash
npm test                    # 59 unit tests: privacy scan, house rules, time zones, encryption,
                            # brand contrast, card rendering, newsletter email and webhooks,
                            # Claude, Meta, LinkedIn and Resend clients (mocked APIs)
npx supabase test db        # 62 database tests: approvals, publishing, token privacy,
                            # newsletter consent, private results
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
   live URL). The migrations already schedule publishing (every minute) and
   results (hourly). On Vercel Pro you can use Vercel Cron on
   `/api/cron/publish` and `/api/cron/results` instead.
9. **Resend:** verify a sending subdomain (for example `mail.lawgistics.my`, so
   the main domain's own email is left alone). Junior sends everything from it:
   sign-in emails if you use Resend for auth SMTP, newsletters, and the free
   sample's link and draft. Set `RESEND_API_KEY` and
   `NEWSLETTER_FROM_DOMAIN`, and add a webhook to
   `https://<app>/api/webhooks/resend` for `email.delivered`, `email.opened`,
   `email.clicked`, `email.bounced` and `email.complained`, with its secret in
   `RESEND_WEBHOOK_SECRET`. Turn on open and click tracking for the domain if
   you want those numbers.

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
- `src/lib/newsletter`: email rendering, Resend client, sender, webhook check;
  `src/lib/results`: results refresh; `src/lib/brand.ts`: colours and contrast
- `src/app/(app)/results`, `src/app/(app)/settings/newsletter`,
  `src/app/subscribe`, `src/app/unsubscribe`: results, newsletter and public pages
- `scripts/mock-platforms.mjs`: local stand-in for Meta, LinkedIn and Resend
- `src/components/mascot.tsx`: Junior (idle, thinking, happy)
