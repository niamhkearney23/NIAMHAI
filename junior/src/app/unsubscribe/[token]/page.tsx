import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { unsubscribeForm } from "../../subscribe/actions";

export const metadata: Metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({ params }: PageProps<"/unsubscribe/[token]">) {
  const { token } = await params;
  const valid = /^[0-9a-f]{48}$/.test(token);
  const admin = createAdminClient();
  const { data: sub } = valid ? await admin.from("subscribers").select("status, user_id").eq("token", token).maybeSingle() : { data: null };
  const { data: owner } = sub
    ? await admin.from("profiles").select("firm, newsletter_from_name").eq("id", sub.user_id).maybeSingle()
    : { data: null };
  const firm = owner?.newsletter_from_name || owner?.firm || "this newsletter";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-6 px-5 py-12">
      {!sub ? (
        <h1 className="font-serif text-4xl text-ink">This link does not work</h1>
      ) : sub.status === "unsubscribed" ? (
        <>
          <h1 className="font-serif text-4xl text-ink">You are unsubscribed</h1>
          <p className="text-[15px] text-ink-2">You will not get any more emails from {firm}.</p>
        </>
      ) : (
        <>
          <h1 className="font-serif text-4xl text-ink">Unsubscribe from {firm}?</h1>
          <form action={unsubscribeForm} className="w-full">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Unsubscribe
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
