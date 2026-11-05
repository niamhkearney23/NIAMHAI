"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUser } from "@/lib/dal";
import { ExtractError, MAX_UPLOAD_BYTES, pdfToText, transcribeAudio } from "@/lib/extract";
import { DraftError, draftPosts } from "@/lib/junior/draft";
import { draftsToPosts } from "@/lib/junior/to-posts";
import { detectPii } from "@/lib/pii";
import { createClient } from "@/lib/supabase/server";

export interface AskState {
  error?: string;
}

const AskSchema = z.object({
  source: z.string().trim().min(80, "Give Junior a bit more to work with: at least a few sentences.").max(150_000, "That is too long. Paste the part you want to write about."),
  source_kind: z.enum(["text", "pdf", "audio"]),
  source_name: z.string().max(255).optional(),
  redactions: z.coerce.number().int().min(0).max(10_000),
  pii_kept: z.enum(["0", "1"]),
});

export async function askJunior(_prev: AskState, formData: FormData): Promise<AskState> {
  await requireUser();
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");

  const parsed = AskSchema.safeParse({
    source: formData.get("source"),
    source_kind: formData.get("source_kind") || "text",
    source_name: formData.get("source_name") || undefined,
    redactions: formData.get("redactions") || 0,
    pii_kept: formData.get("pii_kept") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the source and try again." };
  const { source, source_kind, source_name, redactions, pii_kept } = parsed.data;

  // The browser asks the lawyer about personal details first. Check again here.
  const findings = detectPii(source).filter((f) => f.defaultStrip);
  if (findings.length && pii_kept !== "1") {
    return { error: "This text still looks like it has personal details. Strip them, or confirm they can stay." };
  }

  let drafted;
  try {
    drafted = await draftPosts(profile, source_kind, source);
  } catch (error) {
    if (error instanceof DraftError) return { error: error.message };
    console.error(error);
    return { error: "Something went wrong while drafting. Try again." };
  }

  const supabase = await createClient();
  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .insert({
      title: drafted.drafts.brief_title.slice(0, 200),
      source_kind,
      source_name: source_name ?? null,
      source_text: source,
      redactions,
      pii_kept: pii_kept === "1" && findings.length > 0,
      drafted_with: drafted.draftedWith,
    })
    .select("id")
    .single();

  if (briefError || !brief) {
    console.error("Brief insert failed", briefError);
    return { error: "Junior drafted your posts but could not save them. Try again." };
  }

  const { error: postsError } = await supabase.from("posts").insert(draftsToPosts(brief.id, drafted.drafts));
  if (postsError) {
    console.error("Posts insert failed", postsError);
    await supabase.from("briefs").delete().eq("id", brief.id);
    return { error: "Junior drafted your posts but could not save them. Try again." };
  }

  redirect(`/briefs/${brief.id}`);
}

export interface ExtractResult {
  text?: string;
  detail?: string;
  error?: string;
}

const PathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|mp3|m4a|mp4|wav|webm|ogg|opus|aac)$/i);

/**
 * Reads an upload the browser put in storage, then deletes it. Junior keeps
 * the extracted text (once the lawyer drafts from it), never the file.
 */
export async function extractUpload(path: string, kind: "pdf" | "audio", filename: string): Promise<ExtractResult> {
  const user = await requireUser();
  if (!PathSchema.safeParse(path).success || !path.startsWith(`${user.id}/`)) {
    return { error: "That upload could not be found." };
  }

  const supabase = await createClient();
  const bucket = supabase.storage.from("uploads");

  try {
    const { data: blob, error } = await bucket.download(path);
    if (error || !blob) return { error: "That upload could not be found. Try again." };
    if (blob.size > MAX_UPLOAD_BYTES) return { error: "That file is over 25 MB." };

    if (kind === "pdf") {
      const { text, pages } = await pdfToText(await blob.arrayBuffer());
      return { text, detail: `${pages} page${pages === 1 ? "" : "s"} from ${filename}` };
    }
    const text = await transcribeAudio(blob, filename);
    return { text, detail: `Transcript of ${filename}` };
  } catch (error) {
    if (error instanceof ExtractError) return { error: error.message };
    console.error("Extraction failed", error);
    return { error: "Junior could not read that file. Try again, or paste the text." };
  } finally {
    await bucket.remove([path]);
  }
}
