import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mascot } from "@/components/mascot";
import { getUser } from "@/lib/dal";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getUser()) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <Mascot size={44} />
        <span>
          <span className="block font-serif text-2xl leading-none text-ink">Junior</span>
          <span className="label">by Lawgistics</span>
        </span>
      </Link>
      <h1 className="mb-6 font-serif text-4xl leading-tight text-ink">Sign in</h1>
      <LoginForm next={next} linkError={params.error === "link"} />
      <p className="mt-10 text-sm text-muted">
        By signing in you agree to how Junior handles your data, set out in the{" "}
        <Link href="/privacy" className="text-accent underline underline-offset-4">
          privacy notice
        </Link>
        .
      </p>
    </main>
  );
}
