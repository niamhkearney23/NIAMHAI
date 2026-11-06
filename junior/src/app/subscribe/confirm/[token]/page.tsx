import type { Metadata } from "next";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmSubscription } from "../../actions";

export const metadata: Metadata = { title: "Confirm subscription" };

// A button, not an automatic confirm: email scanners open links too.
export default async function ConfirmSubscriptionPage({ params }: PageProps<"/subscribe/confirm/[token]">) {
  const { token } = await params;
  const valid = /^[0-9a-f]{48}$/.test(token);
  const { data: sub } = valid
    ? await createAdminClient().from("subscribers").select("status").eq("token", token).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-6 px-5 py-12">
      <Mascot mood={sub?.status === "subscribed" ? "happy" : "idle"} size={56} />
      {sub?.status === "subscribed" ? (
        <>
          <h1 className="font-serif text-4xl text-ink">You are subscribed</h1>
          <p className="text-[15px] text-ink-2">Thank you. Every email has an unsubscribe link if you change your mind.</p>
        </>
      ) : sub?.status === "pending" ? (
        <>
          <h1 className="font-serif text-4xl text-ink">One more step</h1>
          <form action={confirmSubscription} className="w-full">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Confirm my subscription
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="font-serif text-4xl text-ink">This link has expired</h1>
          <p className="text-[15px] text-ink-2">Sign up again from the firm&apos;s page to get a new one.</p>
        </>
      )}
    </main>
  );
}
