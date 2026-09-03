import { Wordmark } from "@/components/brand/wordmark";
import { site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-line)] px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Wordmark size="hero" />
        <div className="mt-10 flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Niamh. All rights reserved.
          </p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
