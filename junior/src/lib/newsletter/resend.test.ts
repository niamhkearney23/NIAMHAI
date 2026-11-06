import type http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// Plain JavaScript dev tool; types are inferred.
import { startMockPlatforms } from "../../../scripts/mock-platforms.mjs";
import { PlatformError } from "@/lib/platforms/config";
import { fromAddress, sendBatch } from "./resend";

let mock: http.Server;
let url = "";

beforeAll(async () => {
  mock = await startMockPlatforms({ port: 0 });
  url = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
  Object.assign(process.env, { RESEND_API_URL: url, RESEND_API_KEY: "re_test", NEWSLETTER_FROM_DOMAIN: "news.example.com" });
});
afterAll(() => mock.close());

const email = (to: string) => ({ from: fromAddress("Rahman & Co"), to: [to], subject: "Deposits", html: "<p>Hi</p>", text: "Hi" });

describe("Resend", () => {
  it("builds a safe sender address", () => {
    expect(fromAddress('Rahman & Co <evil@x.com>')).toBe("Rahman & Co evil@x.com <newsletter@news.example.com>");
  });

  it("sends a batch, and a retried batch with the same key sends nothing new", async () => {
    const first = await sendBatch([email("a@example.com"), email("b@example.com")], "issue-1-batch-1");
    const again = await sendBatch([email("a@example.com"), email("b@example.com")], "issue-1-batch-1");
    expect(first).toHaveLength(2);
    expect(again).toEqual(first);
    const sent = await (await fetch(`${url}/__mock/emails`)).json();
    expect(sent.filter((e: { subject: string }) => e.subject === "Deposits")).toHaveLength(2);
  });

  it("treats outages as retryable and a bad key as final", async () => {
    await fetch(`${url}/__mock/fail-next?network=resend&status=503`);
    const busy = await sendBatch([email("c@example.com")], "k2").catch((e) => e);
    expect(busy).toBeInstanceOf(PlatformError);
    expect(busy.retryable).toBe(true);

    process.env.RESEND_API_KEY = "wrong";
    const bad = await sendBatch([email("c@example.com")], "k3").catch((e) => e);
    process.env.RESEND_API_KEY = "re_test";
    expect(bad.retryable).toBe(false);
  });
});
