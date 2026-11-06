import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND } from "@/lib/brand";
import { renderNewsletter, toBlocks } from "./email";
import { signWebhook, verifyWebhook } from "./webhook";

const body = `Most tenants never ask for the deposit back in writing.

What happened

The High Court said a landlord must show actual loss <with receipts>.

This is general information only and not legal advice.`;

describe("newsletter email", () => {
  it("treats short lines as headings", () => {
    expect(toBlocks(body).map((b) => b.kind)).toEqual(["paragraph", "heading", "paragraph", "paragraph"]);
  });

  it("renders escaped HTML, a plain text part and an unsubscribe link", () => {
    const { html, text } = renderNewsletter({
      subject: "Deposits & what to ask",
      body,
      firm: "Rahman & Co",
      footer: "Level 5, Menara X, Kuala Lumpur",
      brand: DEFAULT_BRAND,
      unsubscribeUrl: "https://junior.example/unsubscribe/abc",
    });
    expect(html).toContain("Deposits &amp; what to ask");
    expect(html).toContain("&lt;with receipts&gt;");
    expect(html).not.toContain("<with receipts>");
    expect(html).toContain('href="https://junior.example/unsubscribe/abc"');
    expect(html).toContain("Level 5, Menara X");
    expect(text).toContain("WHAT HAPPENED");
    expect(text).toContain("Unsubscribe: https://junior.example/unsubscribe/abc");
  });
});

describe("webhook signatures", () => {
  const secret = `whsec_${Buffer.from("a-test-secret-of-some-length").toString("base64")}`;
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));
  const payload = JSON.stringify({ type: "email.opened", data: { email_id: "e1" } });

  it("accepts a valid signature", () => {
    const signature = signWebhook("msg_1", ts, payload, secret);
    expect(verifyWebhook({ id: "msg_1", timestamp: ts, signature }, payload, secret, now)).toBe(true);
    expect(verifyWebhook({ id: "msg_1", timestamp: ts, signature: `v1,bad ${signature}` }, payload, secret, now)).toBe(true);
  });

  it("rejects tampering, wrong secrets and old messages", () => {
    const signature = signWebhook("msg_1", ts, payload, secret);
    expect(verifyWebhook({ id: "msg_1", timestamp: ts, signature }, payload + " ", secret, now)).toBe(false);
    expect(verifyWebhook({ id: "msg_2", timestamp: ts, signature }, payload, secret, now)).toBe(false);
    expect(verifyWebhook({ id: "msg_1", timestamp: ts, signature }, payload, "whsec_b3RoZXI=", now)).toBe(false);
    expect(verifyWebhook({ id: "msg_1", timestamp: ts, signature }, payload, secret, now + 10 * 60_000)).toBe(false);
    expect(verifyWebhook({ id: null, timestamp: ts, signature }, payload, secret, now)).toBe(false);
  });
});
