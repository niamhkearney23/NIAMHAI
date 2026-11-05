import type { Metadata } from "next";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui";
import { confirmLink } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

// The link in the email opens this page, and the button finishes signing in.
// Email security scanners follow links but do not press buttons, so they
// cannot use up the one-time link before the lawyer does.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const { token_hash, type } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-6 px-5 py-12">
      <Mascot mood="happy" size={56} />
      <h1 className="font-serif text-4xl text-ink">Welcome back</h1>
      <p className="text-[15px] text-ink-2">Press the button to finish signing in to Junior.</p>
      <form action={confirmLink} className="w-full">
        <input type="hidden" name="token_hash" value={typeof token_hash === "string" ? token_hash : ""} />
        <input type="hidden" name="type" value={typeof type === "string" ? type : ""} />
        <Button type="submit" className="w-full">
          Continue to Junior
        </Button>
      </form>
    </main>
  );
}
