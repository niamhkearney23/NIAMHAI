import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Subscribe" };

export default async function SubscribePage({ params }: PageProps<"/subscribe/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) notFound();
  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("profiles")
    .select("firm, newsletter_from_name")
    .eq("newsletter_slug", slug)
    .eq("newsletter_enabled", true)
    .maybeSingle();
  if (!owner) notFound();
  const firm = owner.newsletter_from_name || owner.firm;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-12">
      <p className="label">Newsletter</p>
      <h1 className="font-serif text-4xl leading-tight text-ink">Legal updates from {firm}</h1>
      <p className="text-[15px] text-ink-2">Plain-language notes on recent decisions and changes in the law. No more than a few a month.</p>
      <SignupForm slug={slug} firm={firm} />
      <p className="text-xs text-muted">
        {firm} uses Junior by Lawgistics to send this newsletter. Your email is used only for it.{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy notice
        </Link>
      </p>
    </main>
  );
}
