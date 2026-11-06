import { createHmac, timingSafeEqual } from "node:crypto";

// Resend signs webhooks the Svix way: HMAC-SHA256 over "id.timestamp.body"
// with the base64 secret after "whsec_". Signatures arrive as "v1,<base64>",
// space separated when the secret is being rotated.

export function verifyWebhook(
  { id, timestamp, signature }: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export function signWebhook(id: string, timestamp: string, body: string, secret: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}
