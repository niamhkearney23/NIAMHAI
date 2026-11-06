import "server-only";
import { PlatformError } from "@/lib/platforms/config";

// Resend's email API, called directly so a mock can stand in for tests.

const apiUrl = () => (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "");

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.NEWSLETTER_FROM_DOMAIN);
}

/** "Rahman & Co <newsletter@news.example.com>" */
export function fromAddress(name: string): string {
  const clean = name.replace(/[<>"\r\n]/g, "").trim() || "Junior";
  return `${clean} <newsletter@${process.env.NEWSLETTER_FROM_DOMAIN}>`;
}

export interface OutgoingEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
}

async function post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new PlatformError("Junior could not reach the email service. It will try again shortly.", { retryable: true });
  }
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const detail = json.message ? ` The email service said: ${json.message}` : "";
    if (res.status === 429 || res.status >= 500) {
      throw new PlatformError(`The email service is busy. Junior will try again shortly.${detail}`, { retryable: true, status: res.status });
    }
    throw new PlatformError(`The email service turned the newsletter down.${detail}`, { retryable: false, status: res.status });
  }
  return json;
}

/** Up to 100 emails in one call. The key makes a retried call safe. */
export async function sendBatch(emails: OutgoingEmail[], idempotencyKey: string): Promise<string[]> {
  const res = await post<{ data: { id: string }[] }>("/emails/batch", emails, idempotencyKey);
  return res.data.map((d) => d.id);
}

export async function sendOne(email: OutgoingEmail): Promise<string> {
  const res = await post<{ id: string }>("/emails", email);
  return res.id;
}
