import { siteUrl } from "@/lib/env";

// Base URLs can be pointed at a local mock for testing. API versions are
// configurable because both platforms retire old ones on a schedule.

const trim = (u: string) => u.replace(/\/$/, "");

export const meta = {
  appId: () => process.env.META_APP_ID ?? "",
  appSecret: () => process.env.META_APP_SECRET ?? "",
  version: () => process.env.META_GRAPH_VERSION || "v26.0",
  graphUrl: () => trim(process.env.META_GRAPH_URL || "https://graph.facebook.com"),
  dialogUrl: () => trim(process.env.META_DIALOG_URL || "https://www.facebook.com"),
  scopes: [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
    "business_management",
  ],
};

export const linkedin = {
  clientId: () => process.env.LINKEDIN_CLIENT_ID ?? "",
  clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET ?? "",
  version: () => process.env.LINKEDIN_API_VERSION || "202608",
  apiUrl: () => trim(process.env.LINKEDIN_API_URL || "https://api.linkedin.com"),
  oauthUrl: () => trim(process.env.LINKEDIN_OAUTH_URL || "https://www.linkedin.com"),
  scopes: ["openid", "profile", "w_member_social"],
};

export type OAuthProvider = "meta" | "linkedin";

export const OAUTH_STATE_COOKIE = "junior_oauth";

export function providerConfigured(provider: OAuthProvider): boolean {
  return provider === "meta"
    ? Boolean(meta.appId() && meta.appSecret())
    : Boolean(linkedin.clientId() && linkedin.clientSecret());
}

export function redirectUri(provider: OAuthProvider): string {
  return `${siteUrl()}/api/connect/${provider}/callback`;
}

/** A platform failure, worded for the lawyer. */
export class PlatformError extends Error {
  constructor(
    message: string,
    readonly options: { retryable: boolean; reconnect?: boolean; status?: number } = { retryable: false },
  ) {
    super(message);
  }
  get retryable() {
    return this.options.retryable;
  }
  get reconnect() {
    return Boolean(this.options.reconnect);
  }
}
