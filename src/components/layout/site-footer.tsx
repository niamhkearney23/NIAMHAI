import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { nav, socials, site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-black)] px-5 py-16 text-[var(--color-cream)] sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Wordmark size="footer" tone="cream" />
        <p className="text-mono mt-4 text-sm font-bold uppercase tracking-[0.15em] text-[var(--color-cream)]/60">
          {site.tagline.toUpperCase()}
        </p>

        <div className="mt-12 grid grid-cols-2 gap-8 border-t border-[var(--color-line-dark)] pt-10 sm:grid-cols-4">
          <div className="flex flex-col gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="underline-grow text-sm text-[var(--color-cream)]/70"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel={s.href.startsWith("http") ? "noreferrer" : undefined}
                className="underline-grow text-sm text-[var(--color-cream)]/70"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--color-line-dark)] pt-6 text-xs text-[var(--color-cream)]/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Niamh. Made with too many tabs open.</p>
          <p>Made somewhere between Melbourne, Kuala Lumpur and 37 open tabs.</p>
        </div>
      </div>
    </footer>
  );
}
