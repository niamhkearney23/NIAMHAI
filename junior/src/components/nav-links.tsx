"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/draft", label: "Draft" },
  { href: "/queue", label: "Queue" },
  { href: "/calendar", label: "Calendar" },
  { href: "/results", label: "Results" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`) || (href === "/queue" && pathname.startsWith("/briefs"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-[3px] px-3 py-1.5 text-[15px] ${active ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-sunken hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
