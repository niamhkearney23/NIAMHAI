import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy notice" };

// Draft notice for Malaysia's PDPA 2010 and Singapore's PDPA 2012. Items in
// [brackets] must be completed by Lawgistics, and the notice reviewed by
// counsel, before launch.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/" className="label hover:text-ink">
        Junior by Lawgistics
      </Link>
      <h1 className="mt-6 font-serif text-4xl text-ink">Privacy notice</h1>
      <p className="mt-2 text-sm text-muted">Last updated [date]. Draft for review.</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-2 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <h2>Who we are</h2>
          <p>
            Junior is run by [Lawgistics legal entity name] (&ldquo;Lawgistics&rdquo;). This notice explains how we handle personal data
            under Malaysia&apos;s Personal Data Protection Act 2010 and Singapore&apos;s Personal Data Protection Act 2012.
          </p>
        </section>
        <section>
          <h2>What we collect and why</h2>
          <ul>
            <li>Your account details (email, name, firm, jurisdiction, practice areas) to run your account.</li>
            <li>Writing samples you give us, to draft posts in your voice.</li>
            <li>Source material you paste or upload, and the drafts made from it, to produce and keep your posts.</li>
            <li>A log of approvals, with who approved and when, so there is a record of what you signed off.</li>
            <li>
              Access tokens for the Facebook, Instagram and LinkedIn accounts you connect, stored encrypted, used only to
              publish what you approve and to read its likes and comments.
            </li>
          </ul>
        </section>
        <section>
          <h2>Client information</h2>
          <p>
            Junior is not meant to hold client personal data. It warns you when text looks like it contains names, identity
            numbers or phone numbers and offers to strip them before anything is drafted. Uploaded PDFs and voice notes are
            deleted as soon as their text has been read.
          </p>
        </section>
        <section>
          <h2>Newsletter subscribers</h2>
          <p>
            When you send a newsletter through Junior, Lawgistics holds your subscribers&apos; email addresses and names on
            your behalf, with a record of how and when each person agreed. People who sign up on your page confirm by
            email first. Every newsletter has an unsubscribe link, and Junior stops emailing anyone who unsubscribes,
            bounces or marks it as spam. You can delete a subscriber, and their consent record, at any time.
          </p>
        </section>
        <section>
          <h2>Emailing Junior</h2>
          <p>
            If you forward a judgment to Junior by email, Junior reads the email text or its PDF attachment, removes identity
            numbers, phone numbers, email addresses and likely names, and drafts from what is left. We keep the extracted
            text as a brief, and a log of when each email arrived and what happened to it, but not the email itself. Our
            email provider keeps received email under its own terms, so avoid forwarding anything you are not allowed to
            share. Emails from anyone who is not a Junior user are not used, and we keep a record of the sender&apos;s
            address for 7 days to spot abuse.
          </p>
        </section>
        <section>
          <h2>Free samples</h2>
          <p>
            If you try Junior without an account, we use your email address to send you a link, and the text you paste to write
            one draft. Before anything is stored or sent to Claude, Junior removes identity numbers, phone numbers, email
            addresses and likely names from that text. We delete the text as soon as the draft is written, and keep the draft
            for 30 days. We keep your email address for 90 days to make sure each person gets one free draft, and for longer
            only if you tick the box to hear from us about Junior, which you can withdraw at any time. A sample draft is
            emailed to you, so it also passes through our email provider.
          </p>
        </section>
        <section>
          <h2>Who processes it</h2>
          <ul>
            <li>Supabase, which hosts our database, sign-in and file storage, in [region].</li>
            <li>Anthropic, whose Claude models write the drafts.</li>
            <li>OpenAI, which transcribes voice notes, if you upload one.</li>
            <li>Resend, which delivers newsletters and records deliveries, opens and clicks.</li>
            <li>Meta and LinkedIn, when you connect an account and Junior publishes to it.</li>
          </ul>
          <p className="mt-2">
            Some of these providers process data outside Malaysia and Singapore. We use them under contracts that require
            comparable protection, as both Acts require for transfers abroad.
          </p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <p>
            We keep your account data while your account is open. You can delete briefs at any time. When you close your
            account, we delete your data within [period], except where the law requires us to keep it.
          </p>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>
            You can ask to see or correct the personal data we hold about you, or withdraw consent, by writing to [privacy
            contact email]. Our data protection officer is [name and contact].
          </p>
        </section>
      </div>
    </main>
  );
}
