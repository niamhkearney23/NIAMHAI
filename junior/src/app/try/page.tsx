import type { Metadata } from "next";
import Link from "next/link";
import { TryForm } from "./try-form";

export const metadata: Metadata = {
  title: "Try Junior free",
  description: "Send Junior part of a judgment and get one LinkedIn post back, checked against the publicity rules.",
};

export default function TryPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5 py-12">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-serif text-2xl text-ink">Junior</span>
        <span className="label">by Lawgistics</span>
      </Link>
      <p className="label">Free sample</p>
      <h1 className="font-serif text-4xl leading-tight text-ink">See what Junior writes before you sign up.</h1>
      <p className="text-[15px] text-ink-2">
        Paste part of a judgment or your own notes. Junior writes one LinkedIn post from it and checks it against the
        publicity rules. It is free, once per email address, and takes about a minute.
      </p>
      <TryForm />
      <p className="text-xs text-muted">
        Junior removes IC numbers, phone numbers, email addresses and likely names from your text, then sends it to
        Anthropic&apos;s Claude to write the draft. We keep the draft for 30 days and delete your text as soon as the draft is
        written.{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy notice
        </Link>
      </p>
    </main>
  );
}
