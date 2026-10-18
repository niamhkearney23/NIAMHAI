import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" aria-label="N1AMH AI home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-6">
          <a
            href="#guides"
            className="underline-grow text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Guides
          </a>
          <a
            href="#about"
            className="underline-grow text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
