import Link from "next/link";
import { redirect } from "next/navigation";
import { Mascot } from "@/components/mascot";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui";
import { getUser } from "@/lib/dal";

const STEPS = [
  ["Paste", "A judgment, your notes or a voice note."],
  ["Ask Junior", "Four drafts in your voice: LinkedIn, an Instagram carousel, Facebook and your newsletter."],
  ["Review", "Every draft comes with checks against the publicity rules. Anything flagged must be fixed or ticked off."],
  ["Approve", "You approve and pick a time. Nothing is published without you."],
];

export default async function Home() {
  if (await getUser()) redirect("/draft");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="flex items-baseline gap-2">
          <span className="font-serif text-2xl text-ink">Junior</span>
          <span className="label">by Lawgistics</span>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/login" size="sm" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-12 pb-20 sm:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="label mb-4">For lawyers in Malaysia and Singapore</p>
            <h1 className="font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
              Your judgments, turned into posts you are happy to sign off.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              Junior drafts your LinkedIn, Instagram, Facebook and newsletter content from the work you already do. It
              sticks to the facts in your source and to the publicity rules.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/login">Get started</ButtonLink>
              <ButtonLink href="/try" variant="secondary">
                Try one free draft
              </ButtonLink>
            </div>
          </div>
          <Mascot size={180} className="justify-self-center" />
        </div>

        <ol className="mt-20 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="bg-bg p-5">
              <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 font-serif text-xl text-ink">{title}</p>
              <p className="mt-1 text-[15px] text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </main>

      <footer className="mx-auto flex max-w-5xl justify-between border-t border-line px-5 py-5 text-sm text-muted">
        <span>Lawgistics</span>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
