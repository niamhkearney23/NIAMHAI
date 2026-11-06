import "server-only";
import { linkedin, PlatformError, redirectUri } from "./config";

// LinkedIn member posts: OAuth 2.0 with OpenID Connect, then the Posts API.

export function linkedinAuthorizeUrl(state: string): string {
  const url = new URL(`${linkedin.oauthUrl()}/oauth/v2/authorization`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", linkedin.clientId());
  url.searchParams.set("redirect_uri", redirectUri("linkedin"));
  url.searchParams.set("state", state);
  url.searchParams.set("scope", linkedin.scopes.join(" "));
  return url.toString();
}

function toError(status: number, body: string): PlatformError {
  let detail = "";
  try {
    const json = JSON.parse(body) as { message?: string };
    if (json.message) detail = ` LinkedIn said: ${json.message}`;
  } catch {}
  if (status === 401) {
    return new PlatformError("Junior's access to LinkedIn has expired. Reconnect it in Settings.", {
      retryable: false,
      reconnect: true,
      status,
    });
  }
  if (status === 403) {
    return new PlatformError(`LinkedIn did not allow the post.${detail}`, { retryable: false, reconnect: true, status });
  }
  if (status === 429 || status >= 500) {
    return new PlatformError(`LinkedIn is busy. Junior will try again shortly.${detail}`, { retryable: true, status });
  }
  return new PlatformError(`LinkedIn turned the post down.${detail}`, { retryable: false, status });
}

async function request(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new PlatformError("Junior could not reach LinkedIn. It will try again shortly.", { retryable: true });
  }
  if (!res.ok) throw toError(res.status, await res.text().catch(() => ""));
  return res;
}

export async function exchangeLinkedinCode(code: string): Promise<{ token: string; expiresAt: Date; scopes: string[] }> {
  const res = await request(`${linkedin.oauthUrl()}/oauth/v2/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri("linkedin"),
      client_id: linkedin.clientId(),
      client_secret: linkedin.clientSecret(),
    }),
  });
  const json = (await res.json()) as { access_token: string; expires_in: number; scope?: string };
  return {
    token: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scopes: (json.scope ?? "").split(/[ ,]+/).filter(Boolean),
  };
}

export async function getMember(token: string): Promise<{ id: string; name: string }> {
  const res = await request(`${linkedin.apiUrl()}/v2/userinfo`, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json()) as { sub: string; name?: string; given_name?: string; family_name?: string };
  return { id: json.sub, name: json.name || [json.given_name, json.family_name].filter(Boolean).join(" ") };
}

// LinkedIn reads post text as "little text format", where these characters
// have meaning. Escaped once, they show as typed.
const RESERVED = /[\\|{}@[\]()<>#*_~]/g;

/** Escape reserved characters, keeping #hashtags as real hashtags. */
export function toLittleText(text: string): string {
  return text
    .replace(RESERVED, (c) => `\\${c}`)
    .replace(/(^|\s)\\#([\p{L}\p{N}]+)/gu, (_m, before: string, tag: string) => `${before}{hashtag|\\#|${tag}}`);
}

export async function publishLinkedinPost(memberId: string, token: string, text: string): Promise<{ id: string; url: string }> {
  const res = await request(`${linkedin.apiUrl()}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": linkedin.version(),
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary: toLittleText(text),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  const id = res.headers.get("x-restli-id") ?? "";
  if (!id) throw new PlatformError("LinkedIn accepted the post but did not say where it is. Check your profile.", { retryable: false });
  return { id, url: `https://www.linkedin.com/feed/update/${id}/` };
}
