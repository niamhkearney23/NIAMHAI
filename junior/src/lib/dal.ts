import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in user, verified with Supabase Auth. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, firm, jurisdiction, practice_areas, voice_samples, timezone, onboarded_at, brand_cover, brand_card, brand_accent, newsletter_enabled, newsletter_from_name, newsletter_reply_to, newsletter_footer, newsletter_slug",
    )
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

/** For app pages: signed in and onboarded, or sent where they need to go. */
export async function requireProfile(): Promise<Profile> {
  await requireUser();
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");
  return profile;
}

export function brandOf(profile: Pick<Profile, "brand_cover" | "brand_card" | "brand_accent">) {
  return { cover: profile.brand_cover, card: profile.brand_card, accent: profile.brand_accent };
}
