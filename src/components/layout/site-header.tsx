import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { nav } from "@/lib/site";
import { RandomButton } from "@/components/layout/random-button";
import { MobileMenu } from "@/components/layout/mobile-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line-dark)] bg-[var(--color-black)] text-[var(--color-cream)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" aria-label="N1AMH AI home">
          <Wordmark tone="cream" />
        </Link>
        <nav className="hidden items-center gap-7 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="underline-grow text-xs font-bold uppercase tracking-wide"
            >
              {item.label}
            </Link>
          ))}
          <RandomButton />
          <span className="text-mono hidden items-center gap-1 rounded border border-[var(--color-cream)]/20 px-2 py-1 text-[10px] text-[var(--color-cream)]/50 lg:flex">
            ⌘K
          </span>
        </nav>
        <MobileMenu />
      </div>
    </header>
  );
}
