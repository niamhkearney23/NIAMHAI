import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { encryptionConfigured } from "@/lib/crypto";
import { getUser } from "@/lib/dal";
import { OAUTH_STATE_COOKIE, providerConfigured, type OAuthProvider } from "@/lib/platforms/config";
import { linkedinAuthorizeUrl } from "@/lib/platforms/linkedin";
import { metaAuthorizeUrl } from "@/lib/platforms/meta";

// Starts Facebook Login or LinkedIn sign-in. A random state value, kept in an
// httpOnly cookie, ties the callback to this browser.
export async function GET(_request: Request, ctx: RouteContext<"/api/connect/[provider]">) {
  const { provider } = await ctx.params;
  if (provider !== "meta" && provider !== "linkedin") return new NextResponse("Not found", { status: 404 });

  const settings = new URL("/settings", siteUrl());
  settings.hash = "connections";
  if (!(await getUser())) return NextResponse.redirect(new URL("/login?next=/settings", siteUrl()));
  if (!providerConfigured(provider as OAuthProvider) || !encryptionConfigured()) {
    settings.searchParams.set("connect_error", "not_configured");
    settings.searchParams.set("provider", provider);
    return NextResponse.redirect(settings);
  }

  const state = randomBytes(24).toString("base64url");
  const url = provider === "meta" ? metaAuthorizeUrl(state) : linkedinAuthorizeUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, `${provider}.${state}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/connect",
    maxAge: 600,
  });
  return res;
}
