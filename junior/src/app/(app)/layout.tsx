import Link from "next/link";
import { Mascot } from "@/components/mascot";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireProfile } from "@/lib/dal";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <Link href="/draft" className="flex items-center gap-2.5">
            <Mascot size={30} />
            <span className="flex items-baseline gap-2">
              <span className="font-serif text-xl leading-none text-ink">Junior</span>
              <span className="label hidden sm:inline">by Lawgistics</span>
            </span>
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted md:inline">{profile.full_name}</span>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button type="submit" className="h-8 rounded-[3px] px-2.5 text-sm text-muted hover:bg-sunken hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-4 text-sm text-muted">
          <span>Nothing is published without your approval.</span>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
