import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { connectPage, savePendingPages, saveConnection } from "@/lib/connections";
import { safeEqual } from "@/lib/crypto";
import { getUser } from "@/lib/dal";
import { OAUTH_STATE_COOKIE, PlatformError } from "@/lib/platforms/config";
import { exchangeLinkedinCode, getMember } from "@/lib/platforms/linkedin";
import { exchangeMetaCode, listPages } from "@/lib/platforms/meta";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/connect/[provider]/callback">) {
  const { provider } = await ctx.params;
  const params = request.nextUrl.searchParams;
  const settings = new URL("/settings", siteUrl());
  settings.hash = "connections";

  const done = (outcome: Record<string, string>, to: URL = settings) => {
    for (const [k, v] of Object.entries(outcome)) to.searchParams.set(k, v);
    const res = NextResponse.redirect(to);
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/connect" });
    return res;
  };

  if (provider !== "meta" && provider !== "linkedin") return new NextResponse("Not found", { status: 404 });
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", siteUrl()));

  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const state = params.get("state") ?? "";
  if (!state || !safeEqual(expected, `${provider}.${state}`)) {
    return done({ connect_error: "state", provider });
  }
  if (params.get("error") || !params.get("code")) {
    return done({ connect_error: "cancelled", provider });
  }
  const code = params.get("code")!;

  try {
    if (provider === "linkedin") {
      const { token, expiresAt, scopes } = await exchangeLinkedinCode(code);
      const member = await getMember(token);
      await saveConnection(user.id, "linkedin", { externalId: member.id, displayName: member.name, token, expiresAt, scopes });
      return done({ connected: "linkedin" });
    }

    const { userToken, scopes } = await exchangeMetaCode(code);
    const pages = await listPages(userToken);
    if (!pages.length) return done({ connect_error: "no_pages", provider });
    if (pages.length === 1) {
      await connectPage(user.id, pages[0], scopes);
      return done({ connected: "facebook" });
    }
    await savePendingPages(user.id, pages, scopes);
    return done({}, new URL("/settings/facebook-page", siteUrl()));
  } catch (error) {
    console.error(`${provider} connection failed`, error instanceof PlatformError ? error.message : error);
    return done({ connect_error: "failed", provider });
  }
}
