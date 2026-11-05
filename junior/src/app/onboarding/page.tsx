import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MascotMessage } from "@/components/mascot";
import { ProfileForm } from "@/components/profile/profile-form";
import { getProfile, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/draft");

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <div className="mb-10">
        <MascotMessage title="Hello. I'm Junior.">
          A few details and I can start drafting posts that sound like you. It takes about three minutes.
        </MascotMessage>
      </div>
      <ProfileForm profile={profile} mode="onboarding" />
    </main>
  );
}
