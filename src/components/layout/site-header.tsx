import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const links = [
  { href: "/#guides", label: "Guides" },
  { href: "/#about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-red)] text-[var(--color-cream)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" aria-label="N1AMH AI home">
          <Wordmark tone="cream" />
        </Link>
        <nav className="hidden items-center gap-8 sm:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold uppercase tracking-wide hover:opacity-80"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="#guides"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-cream)]/70 text-[10px] font-bold uppercase tracking-wide sm:hidden"
          aria-label="Open menu"
        >
          Menu
        </a>
      </div>
    </header>
  );
}
