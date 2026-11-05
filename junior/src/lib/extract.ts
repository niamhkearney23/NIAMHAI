import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/** A problem with an upload the lawyer can fix. */
export class ExtractError extends Error {}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/(\w)-\n(\w)/g, "$1$2") // words hyphenated across lines
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function pdfToText(data: ArrayBuffer): Promise<{ text: string; pages: number }> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(data));
  } catch {
    throw new ExtractError("That file could not be opened as a PDF.");
  }
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const clean = tidy(text);
  if (clean.length < 40) {
    throw new ExtractError(
      "Junior could not find any text in this PDF. It may be a scan. Copy the text in, or upload a PDF with selectable text.",
    );
  }
  return { text: clean, pages: totalPages };
}

/**
 * Voice notes are transcribed with OpenAI's speech-to-text API. Claude does not
 * take audio, so this is the one step that uses another provider.
 */
export async function transcribeAudio(file: Blob, filename: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ExtractError("Voice notes are not switched on yet. Paste your notes instead.");

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe");
  form.append("response_format", "text");
  form.append(
    "prompt",
    "A lawyer in Malaysia or Singapore dictating notes about a case or legal update. Use British spelling.",
  );

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    console.error("Transcription failed", res.status, await res.text().catch(() => ""));
    throw new ExtractError("Junior could not transcribe that recording. Try again, or paste your notes.");
  }
  const text = tidy(await res.text());
  if (!text) throw new ExtractError("Junior could not hear any speech in that recording.");
  return text;
}
