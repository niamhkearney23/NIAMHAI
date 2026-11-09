import { describe, expect, it } from "vitest";
import { clientIp, emailKey, ipHash, samplesEnabled, samplesPerDay } from "./samples";

describe("emailKey", () => {
  it("treats one inbox written several ways as one person", () => {
    const same = ["annatan@gmail.com", "Anna.Tan@gmail.com", "anna.tan+junior@gmail.com", "AnnaTan@googlemail.com"];
    expect(new Set(same.map(emailKey)).size).toBe(1);
  });

  it("drops plus tags everywhere, but dots only for Gmail", () => {
    expect(emailKey("anna+x@firm.com.my")).toBe("anna@firm.com.my");
    expect(emailKey("anna.tan@firm.com.my")).toBe("anna.tan@firm.com.my");
    expect(emailKey("annatan@firm.com.my")).not.toBe(emailKey("anna.tan@firm.com.my"));
  });

  it("keeps odd addresses usable", () => {
    expect(emailKey("+tag@example.com")).toBe("+tag@example.com");
    expect(emailKey("  Anna@Example.COM ")).toBe("anna@example.com");
  });
});

describe("network identity", () => {
  const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

  it("takes the first address Vercel forwards, then falls back", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIp(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(headers({}))).toBe("unknown");
  });

  it("stores only a keyed hash, never the address", () => {
    const hashed = ipHash("203.0.113.9");
    expect(hashed).toMatch(/^[0-9a-f]{32}$/);
    expect(hashed).not.toContain("203");
    expect(ipHash("203.0.113.9")).toBe(hashed);
    expect(ipHash("203.0.113.10")).not.toBe(hashed);
  });
});

describe("settings", () => {
  it("is on with a 30 a day cap unless told otherwise", () => {
    delete process.env.JUNIOR_SAMPLES;
    delete process.env.JUNIOR_SAMPLES_PER_DAY;
    expect(samplesEnabled()).toBe(true);
    expect(samplesPerDay()).toBe(30);
  });

  it("can be switched off or capped from the environment", () => {
    process.env.JUNIOR_SAMPLES = "OFF";
    process.env.JUNIOR_SAMPLES_PER_DAY = "5";
    expect(samplesEnabled()).toBe(false);
    expect(samplesPerDay()).toBe(5);
    process.env.JUNIOR_SAMPLES_PER_DAY = "nonsense";
    expect(samplesPerDay()).toBe(30);
    delete process.env.JUNIOR_SAMPLES;
    delete process.env.JUNIOR_SAMPLES_PER_DAY;
  });
});
