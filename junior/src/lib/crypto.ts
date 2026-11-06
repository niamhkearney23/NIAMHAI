import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

// Social tokens are encrypted with AES-256-GCM before they are stored.
// The key lives only in the server's environment (TOKEN_ENCRYPTION_KEY,
// 32 random bytes, base64). Format: v1.<iv>.<tag>.<ciphertext>, base64url.

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  return buf;
}

export function encryptionConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  // Binds the ciphertext to its owner, so it cannot be pasted onto another row.
  cipher.setAAD(Buffer.from(context));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(token: string, context: string): string {
  const [version, iv, tag, ct] = token.split(".");
  if (version !== VERSION || !iv || !tag || !ct) throw new Error("Unrecognised secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** Compare secrets without leaking their length or content through timing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
