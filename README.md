# N1AMH AI

Personal-brand site for N1AMH AI — practical AI guides and workflows, in
the style of a bold red-and-cream editorial layout.

## Stack

- [Next.js](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4

## Structure

- `src/app/page.tsx` — homepage (hero, about, recent guides)
- `src/app/guides/[slug]/page.tsx` — individual guide pages
- `src/lib/guides.ts` — all guide content lives here; add a new object to
  the `guides` array to publish a new guide
- `src/components/` — header, footer, wordmark, and homepage sections

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
