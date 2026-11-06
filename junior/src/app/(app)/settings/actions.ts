"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { connectPage, readPendingPages, removeConnection, type Provider } from "@/lib/connections";
import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export async function disconnectAccount(formData: FormData) {
  const user = await requireUser();
  const provider = String(formData.get("provider")) as Provider;
  if (!["facebook", "instagram", "linkedin"].includes(provider)) return;
  // Instagram rides on the Facebook Page, so it goes with it.
  await removeConnection(user.id, provider === "instagram" ? "facebook" : provider);
  refresh();
}

export async function choosePage(formData: FormData) {
  const user = await requireUser();
  const pageId = String(formData.get("page_id") ?? "");
  const pending = await readPendingPages(user.id);
  const page = pending?.pages.find((p) => p.id === pageId);
  if (!pending || !page) redirect("/settings?connect_error=failed&provider=meta#connections");
  await connectPage(user.id, page, pending.scopes);
  redirect("/settings?connected=facebook#connections");
}

export interface BrandState {
  error?: string;
  saved?: boolean;
}

export async function saveBrand(_prev: BrandState, formData: FormData): Promise<BrandState> {
  const user = await requireUser();
  const pick = (k: string) => String(formData.get(k) ?? "").trim().toUpperCase();
  const brand = { brand_cover: pick("cover"), brand_card: pick("card"), brand_accent: pick("accent") };
  if (!Object.values(brand).every((v) => /^#[0-9A-F]{6}$/.test(v))) return { error: "Use colours like #171B28." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(brand).eq("id", user.id);
  if (error) return { error: "Junior could not save your colours. Try again." };
  refresh();
  return { saved: true };
}
