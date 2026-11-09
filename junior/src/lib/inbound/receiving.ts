import "server-only";
import { PlatformError } from "@/lib/platforms/config";
import type { AttachmentInfo, ReceivingAuth } from "./email-text";

// Resend's Receiving API: the webhook only says an email arrived. The body,
// headers, sender checks and attachments are fetched from here.

const apiUrl = () => (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "");

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  headers: Record<string, string>;
  authentication: ReceivingAuth | null;
  attachments: AttachmentInfo[];
}

export interface ReceivedAttachment extends AttachmentInfo {
  download_url: string;
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new PlatformError("Junior could not reach the email service.", { retryable: true });
  }
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    throw new PlatformError(`The email service said: ${json.message ?? res.status}`, { retryable, status: res.status });
  }
  return json;
}

export async function getReceivedEmail(id: string): Promise<ReceivedEmail> {
  // cid keeps inline images as references; the default inlines them as base64,
  // which can run to tens of megabytes and is of no use here.
  return get<ReceivedEmail>(`/emails/receiving/${encodeURIComponent(id)}?html_format=cid`);
}

export async function listReceivedAttachments(id: string): Promise<ReceivedAttachment[]> {
  const res = await get<{ data: ReceivedAttachment[] }>(`/emails/receiving/${encodeURIComponent(id)}/attachments?limit=20`);
  return res.data ?? [];
}

/** Download a file, refusing anything over the limit. The URL is a signed link that lasts an hour. */
export async function downloadAttachment(url: string, maxBytes: number): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new PlatformError("Junior could not download the attachment.", { retryable: true });
  }
  if (!res.ok) {
    throw new PlatformError("Junior could not download the attachment.", { retryable: res.status === 429 || res.status >= 500, status: res.status });
  }
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new PlatformError("The attachment is too large.", { retryable: false });
  const data = await res.arrayBuffer();
  if (data.byteLength > maxBytes) throw new PlatformError("The attachment is too large.", { retryable: false });
  return data;
}
