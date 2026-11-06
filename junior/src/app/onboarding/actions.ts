"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { DEFAULT_TIMEZONE } from "@/lib/channels";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export interface ProfileFormState {
  error?: string;
  fieldErrors?: Partial<Record<"full_name" | "firm" | "jurisdiction" | "practice_areas" | "voice_samples", string>>;
  saved?: boolean;
}

const ProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Add your name.").max(120),
  firm: z.string().trim().min(1, "Add your firm.").max(160),
  jurisdiction: z.enum(["MY", "SG", "BOTH"], { message: "Choose where you practise." }),
  practice_areas: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Choose at least one practice area.")
    .max(12, "Choose up to 12 practice areas."),
  voice_samples: z
    .array(z.string().trim().max(5000, "Keep each sample under 5,000 characters."))
    .transform((list) => list.filter((s) => s.length > 0))
    .pipe(
      z
        .array(z.string().min(40, "Each sample needs at least a few sentences."))
        .min(2, "Add at least two past posts so Junior can learn your voice.")
        .max(3),
    ),
});

function parse(formData: FormData) {
  const other = String(formData.get("practice_other") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const areas = [...new Set([...formData.getAll("practice_areas").map(String), ...other])];
  return ProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    firm: formData.get("firm"),
    jurisdiction: formData.get("jurisdiction"),
    practice_areas: areas,
    voice_samples: formData.getAll("voice_samples").map(String),
  });
}

export async function saveProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    const fieldErrors: ProfileFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileFormState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { error: "A few details need attention.", fieldErrors };
  }

  const onboarding = formData.get("mode") === "onboarding";
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      timezone: DEFAULT_TIMEZONE[parsed.data.jurisdiction],
      updated_at: new Date().toISOString(),
      ...(onboarding ? { onboarded_at: new Date().toISOString() } : {}),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update failed", error);
    return { error: "Junior could not save your details. Try again." };
  }

  if (onboarding) redirect("/settings?welcome=1#connections");
  refresh();
  return { saved: true };
}
