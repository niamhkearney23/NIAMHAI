import http from "node:http";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
// Plain JavaScript dev tool; types are inferred.
import { startMockPlatforms } from "../../../scripts/mock-platforms.mjs";
import { PlatformError } from "./config";
import { exchangeLinkedinCode, getMember, linkedinAuthorizeUrl, publishLinkedinPost, toLittleText } from "./linkedin";
import { exchangeMetaCode, listPages, metaAuthorizeUrl, publishCarousel, publishToPage } from "./meta";

let mock: http.Server;
let images: http.Server;
let mockUrl = "";
let imageUrl = "";

beforeAll(async () => {
  mock = await startMockPlatforms({ port: 0 });
  mockUrl = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
  const jpeg = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#171B28" } }).jpeg().toBuffer();
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer();
  images = http.createServer((req, res) => {
    const isPng = req.url?.endsWith(".png");
    res.writeHead(200, { "content-type": isPng ? "image/png" : "image/jpeg" });
    res.end(isPng ? png : jpeg);
  });
  await new Promise<void>((r) => images.listen(0, "127.0.0.1", r));
  imageUrl = `http://127.0.0.1:${(images.address() as AddressInfo).port}`;

  Object.assign(process.env, {
    META_APP_ID: "mock-app",
    META_APP_SECRET: "mock-secret",
    META_GRAPH_URL: mockUrl,
    META_DIALOG_URL: mockUrl,
    LINKEDIN_CLIENT_ID: "mock-client",
    LINKEDIN_CLIENT_SECRET: "mock-secret",
    LINKEDIN_API_URL: mockUrl,
    LINKEDIN_OAUTH_URL: mockUrl,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  });
});

afterAll(() => {
  mock.close();
  images.close();
});

beforeEach(async () => {
  await fetch(`${mockUrl}/__mock/reset`);
});

const posts = async () => (await fetch(`${mockUrl}/__mock/posts`)).json();

describe("LinkedIn", () => {
  it("keeps the text exactly as written, with working hashtags", () => {
    expect(toLittleText("Section 20(1) [Act] applies. #EmploymentLaw")).toBe(
      "Section 20\\(1\\) \\[Act\\] applies. {hashtag|\\#|EmploymentLaw}",
    );
    expect(toLittleText("Email me@firm.my_ok *now* ~ <b>")).toBe("Email me\\@firm.my\\_ok \\*now\\* \\~ \\<b\\>");
  });

  it("builds the sign-in URL with the right scopes", () => {
    const url = new URL(linkedinAuthorizeUrl("st4te"));
    expect(url.searchParams.get("scope")).toBe("openid profile w_member_social");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/connect/linkedin/callback");
    expect(url.searchParams.get("state")).toBe("st4te");
  });

  it("connects and publishes a member post", async () => {
    const { token, expiresAt } = await exchangeLinkedinCode("LI_CODE");
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 50 * 86400_000);
    const member = await getMember(token);
    expect(member).toEqual({ id: "aB3xYz", name: "Nur Aisyah Rahman" });

    const text = "Probation is not a free pass (see s. 20).\n\n#EmploymentLaw #Malaysia";
    const result = await publishLinkedinPost(member.id, token, text);
    expect(result.id).toMatch(/^urn:li:share:/);
    expect(result.url).toBe(`https://www.linkedin.com/feed/update/${result.id}/`);
    expect((await posts())[0].text).toBe(text);
  });

  it("marks outages as retryable and bad tokens as reconnect", async () => {
    await fetch(`${mockUrl}/__mock/fail-next?network=linkedin&status=503`);
    const busy = await publishLinkedinPost("aB3xYz", "LI_TOKEN", "Text").catch((e) => e);
    expect(busy).toBeInstanceOf(PlatformError);
    expect(busy.retryable).toBe(true);

    const expired = await publishLinkedinPost("aB3xYz", "OLD_TOKEN", "Text").catch((e) => e);
    expect(expired.retryable).toBe(false);
    expect(expired.reconnect).toBe(true);
  });
});

describe("Facebook and Instagram", () => {
  it("builds the Facebook Login URL", () => {
    const url = new URL(metaAuthorizeUrl("st4te"));
    expect(url.pathname).toBe("/v26.0/dialog/oauth");
    expect(url.searchParams.get("scope")).toContain("pages_manage_posts");
    expect(url.searchParams.get("scope")).toContain("instagram_content_publish");
  });

  it("exchanges the code for a long-lived token and lists Pages", async () => {
    const { userToken, scopes } = await exchangeMetaCode("META_CODE");
    expect(userToken).toBe("LONG_USER");
    expect(scopes).toContain("pages_manage_posts");
    const pages = await listPages(userToken);
    expect(pages.map((p) => p.name)).toEqual(["Rahman & Co", "Rahman & Co Careers"]);
    expect(pages[0].instagram).toEqual({ id: "17841400000000001", username: "rahmanandco" });
    expect(pages[1].instagram).toBeNull();
  });

  it("publishes a Page post", async () => {
    const result = await publishToPage("1001", "PAGE_TOKEN_1001", "Hello from Junior");
    expect(result.id).toMatch(/^1001_/);
    expect(result.url).toContain("/__mock/feed#");
    expect((await posts())[0]).toMatchObject({ network: "Facebook", where: "Rahman & Co", text: "Hello from Junior" });
  });

  it("asks for a reconnect when the Page token is rejected", async () => {
    const err = await publishToPage("1001", "WRONG", "Hello").catch((e) => e);
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.reconnect).toBe(true);
  });

  it("treats Graph outages as retryable", async () => {
    await fetch(`${mockUrl}/__mock/fail-next?network=facebook&status=500`);
    const err = await publishToPage("1001", "PAGE_TOKEN_1001", "Hello").catch((e) => e);
    expect(err.retryable).toBe(true);
  });

  it("publishes a carousel, waiting for Instagram to process it", async () => {
    const urls = [1, 2, 3].map((i) => `${imageUrl}/${i}.jpg`);
    const result = await publishCarousel("17841400000000001", "PAGE_TOKEN_1001", urls, "Caption #Law", { pollMs: 5 });
    expect(result.url).toContain("/__mock/feed#");
    expect((await posts())[0]).toMatchObject({ network: "Instagram", where: "@rahmanandco", text: "Caption #Law", images: 3 });
  });

  it("refuses images Instagram cannot use", async () => {
    const urls = [`${imageUrl}/1.png`, `${imageUrl}/2.png`];
    const err = await publishCarousel("17841400000000001", "PAGE_TOKEN_1001", urls, "Caption", { pollMs: 5 }).catch((e) => e);
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.retryable).toBe(false);
    const one = await publishCarousel("17841400000000001", "PAGE_TOKEN_1001", [`${imageUrl}/1.jpg`], "x").catch((e) => e);
    expect(one.message).toMatch(/between 2 and 10/);
  });
});
