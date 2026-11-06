import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, safeEqual } from "./crypto";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("token encryption", () => {
  it("round-trips and never stores the plaintext", () => {
    const sealed = encryptSecret("EAAB-page-token", "user-1:facebook");
    expect(sealed).not.toContain("EAAB");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(decryptSecret(sealed, "user-1:facebook")).toBe("EAAB-page-token");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same", "ctx")).not.toBe(encryptSecret("same", "ctx"));
  });

  it("refuses a token moved to another user's row", () => {
    const sealed = encryptSecret("secret", "user-1:linkedin");
    expect(() => decryptSecret(sealed, "user-2:linkedin")).toThrow();
  });

  it("refuses tampered ciphertext", () => {
    const sealed = encryptSecret("secret", "ctx");
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), "ctx")).toThrow();
  });

  it("compares secrets safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
