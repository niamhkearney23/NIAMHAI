"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { connectPage, readPendingPages, removeConnection, type Provider } from "@/lib/connections";
import { requireUser } from "@/lib/dal";

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
