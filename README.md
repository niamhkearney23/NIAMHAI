# N1AMH AI

Editorial digital-lab site for N1AMH AI — practical AI guides, prompts,
and experiments, cream/near-black/charcoal with one signal-orange accent.

## Stack

- [Next.js](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- [Resend](https://resend.com) for newsletter signups
- Vercel Web Analytics

## Structure

- `src/app/page.tsx` — homepage (hero, intent finder, steal-a-prompt,
  guides preview, AI stack, lab preview, start here, about, newsletter)
- `src/app/guides/page.tsx` — filterable/searchable guide index
- `src/app/guides/[slug]/page.tsx` — individual guide pages
- `src/app/prompts/`, `/lab/`, `/start-here/`, `/about/` — dedicated pages
- `src/lib/guides.ts` — all guide content; add an object to the `guides`
  array to publish a new guide (each has `blocks`: text/prompt/callout)
- `src/lib/prompts.ts`, `experiments.ts`, `stack.ts`, `start-here.ts` —
  content for the corresponding homepage sections and pages
- `src/components/` — layout (header/footer/nav), sections, and shared
  UI (command palette, copy-prompt, guide cards, etc.)

## Newsletter signup

`src/app/api/subscribe/route.ts` adds emails to a Resend Audience. To
enable it, set in `.env.local` (or your Vercel project's environment
variables):

```
RESEND_API_KEY=...
RESEND_AUDIENCE_ID=...
```

Without these set, the signup form still renders and submits, but the
API responds with a friendly "couldn't save that" error instead of
silently pretending to succeed.

## Analytics

Vercel Web Analytics is wired in via `@vercel/analytics` — no extra
config needed once the site is deployed on Vercel with Web Analytics
enabled for the project (Project → Analytics tab).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
