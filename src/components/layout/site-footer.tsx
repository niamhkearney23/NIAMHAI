import { Wordmark } from "@/components/brand/wordmark";
import { socials, site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Wordmark size="footer" />
        <p className="mt-3 text-sm text-[var(--color-muted)]">{site.tagline}</p>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--color-border)] pt-8">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel={s.href.startsWith("http") ? "noreferrer" : undefined}
              className="underline-grow text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              {s.label}
            </a>
          ))}
        </div>

        <p className="mt-8 text-xs text-[var(--color-muted)]">
          © {year} Niamh. Made with too many tabs open.
        </p>
      </div>
    </footer>
  );
}
