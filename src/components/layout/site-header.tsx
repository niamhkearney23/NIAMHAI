import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line-dark)] bg-[var(--color-black)] text-[var(--color-cream)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" aria-label="N1AMH AI home">
          <Wordmark tone="cream" />
        </Link>
        <nav className="flex items-center gap-6">
          <a href="#guides" className="underline-grow text-xs font-bold uppercase tracking-wide">
            Guides
          </a>
          <a href="#about" className="underline-grow text-xs font-bold uppercase tracking-wide">
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
