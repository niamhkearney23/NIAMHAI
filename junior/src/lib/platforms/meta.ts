import "server-only";
import { createHmac } from "node:crypto";
import { meta, PlatformError, redirectUri } from "./config";

// Facebook Pages and Instagram (professional account linked to a Page), via
// Facebook Login and the Graph API.

interface GraphError {
  message?: string;
  code?: number;
  error_subcode?: number;
  is_transient?: boolean;
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80001, 80002, 80004]);
const TRANSIENT_CODES = new Set([1, 2]);

function toError(error: GraphError | undefined, status: number, network: "Facebook" | "Instagram"): PlatformError {
  const code = error?.code ?? 0;
  const detail = error?.message ? ` ${network} said: ${error.message}` : "";
  if (code === 190 || code === 102 || status === 401) {
    return new PlatformError(`Junior's access to ${network} has expired or been removed. Reconnect it in Settings.`, {
      retryable: false,
      reconnect: true,
      status,
    });
  }
  if (code === 10 || code === 200) {
    return new PlatformError(`Junior does not have permission to post there.${detail}`, { retryable: false, reconnect: true, status });
  }
  if (RATE_LIMIT_CODES.has(code) || TRANSIENT_CODES.has(code) || error?.is_transient || status >= 500 || status === 429) {
    return new PlatformError(`${network} is busy. Junior will try again shortly.${detail}`, { retryable: true, status });
  }
  return new PlatformError(`${network} turned the post down.${detail}`, { retryable: false, status });
}

async function graph<T>(
  path: string,
  { method = "GET", params = {}, token, network = "Facebook" }: {
    method?: "GET" | "POST";
    params?: Record<string, string>;
    token?: string;
    network?: "Facebook" | "Instagram";
  },
): Promise<T> {
  const url = new URL(`${meta.graphUrl()}/${meta.version()}/${path.replace(/^\//, "")}`);
  // appsecret_proof ties each call to our app secret, so a leaked token is no
  // use on its own (and Meta can be told to require it).
  const all = token
    ? { ...params, access_token: token, appsecret_proof: createHmac("sha256", meta.appSecret()).update(token).digest("hex") }
    : params;
  let res: Response;
  try {
    if (method === "GET") {
      for (const [k, v] of Object.entries(all)) url.searchParams.set(k, v);
      res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    } else {
      res = await fetch(url, { method: "POST", body: new URLSearchParams(all), signal: AbortSignal.timeout(30_000) });
    }
  } catch {
    throw new PlatformError(`Junior could not reach ${network}. It will try again shortly.`, { retryable: true });
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: GraphError };
  if (!res.ok || json.error) throw toError(json.error, res.status, network);
  return json;
}

export function metaAuthorizeUrl(state: string): string {
  const url = new URL(`${meta.dialogUrl()}/${meta.version()}/dialog/oauth`);
  url.searchParams.set("client_id", meta.appId());
  url.searchParams.set("redirect_uri", redirectUri("meta"));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (meta.loginConfigId()) url.searchParams.set("config_id", meta.loginConfigId());
  else url.searchParams.set("scope", meta.scopes.join(","));
  return url.toString();
}

/** Code to a long-lived user token. Page tokens derived from it do not expire. */
export async function exchangeMetaCode(code: string): Promise<{ userToken: string; scopes: string[] }> {
  const short = await graph<{ access_token: string }>("oauth/access_token", {
    params: { client_id: meta.appId(), client_secret: meta.appSecret(), redirect_uri: redirectUri("meta"), code },
  });
  const long = await graph<{ access_token: string }>("oauth/access_token", {
    params: {
      grant_type: "fb_exchange_token",
      client_id: meta.appId(),
      client_secret: meta.appSecret(),
      fb_exchange_token: short.access_token,
    },
  });
  const perms = await graph<{ data: { permission: string; status: string }[] }>("me/permissions", { token: long.access_token });
  return {
    userToken: long.access_token,
    scopes: perms.data.filter((p) => p.status === "granted").map((p) => p.permission),
  };
}

export interface MetaPage {
  id: string;
  name: string;
  accessToken: string;
  instagram: { id: string; username: string } | null;
}

export async function listPages(userToken: string): Promise<MetaPage[]> {
  const res = await graph<{
    data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[];
  }>("me/accounts", {
    token: userToken,
    params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100" },
  });
  return res.data.map((p) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    instagram: p.instagram_business_account
      ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username ?? "" }
      : null,
  }));
}

export interface Published {
  id: string;
  url: string | null;
}

export async function publishToPage(pageId: string, pageToken: string, message: string): Promise<Published> {
  const { id } = await graph<{ id: string }>(`${pageId}/feed`, { method: "POST", token: pageToken, params: { message } });
  const link = await graph<{ permalink_url?: string }>(id, { token: pageToken, params: { fields: "permalink_url" } }).catch(
    () => ({ permalink_url: undefined }),
  );
  return { id, url: link.permalink_url ?? `https://www.facebook.com/${id}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitUntilReady(containerId: string, token: string, pollMs: number) {
  for (let i = 0; i < 30; i++) {
    const { status_code } = await graph<{ status_code?: string }>(containerId, {
      token,
      network: "Instagram",
      params: { fields: "status_code" },
    });
    if (status_code === "FINISHED" || status_code === "PUBLISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new PlatformError("Instagram could not process the carousel images. Junior will try again shortly.", {
        retryable: true,
      });
    }
    await sleep(pollMs);
  }
  throw new PlatformError("Instagram took too long to process the carousel. Junior will try again shortly.", { retryable: true });
}

/** Item containers, then the carousel container, then publish. */
export async function publishCarousel(
  igUserId: string,
  token: string,
  imageUrls: string[],
  caption: string,
  { pollMs = 2000 } = {},
): Promise<Published> {
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new PlatformError("An Instagram carousel needs between 2 and 10 cards.", { retryable: false });
  }
  const children: string[] = [];
  for (const image_url of imageUrls) {
    const { id } = await graph<{ id: string }>(`${igUserId}/media`, {
      method: "POST",
      token,
      network: "Instagram",
      params: { image_url, is_carousel_item: "true" },
    });
    children.push(id);
  }
  for (const id of children) await waitUntilReady(id, token, pollMs);

  const carousel = await graph<{ id: string }>(`${igUserId}/media`, {
    method: "POST",
    token,
    network: "Instagram",
    params: { media_type: "CAROUSEL", children: children.join(","), caption },
  });
  await waitUntilReady(carousel.id, token, pollMs);

  const { id } = await graph<{ id: string }>(`${igUserId}/media_publish`, {
    method: "POST",
    token,
    network: "Instagram",
    params: { creation_id: carousel.id },
  });
  const link = await graph<{ permalink?: string }>(id, { token, network: "Instagram", params: { fields: "permalink" } }).catch(
    () => ({ permalink: undefined }),
  );
  return { id, url: link.permalink ?? null };
}

export interface Metrics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

/** Reactions, comments and shares on a Page post. */
export async function pagePostMetrics(postId: string, pageToken: string): Promise<Metrics> {
  const r = await graph<{
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  }>(postId, {
    token: pageToken,
    params: { fields: "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares" },
  });
  return { likes: r.reactions?.summary?.total_count ?? 0, comments: r.comments?.summary?.total_count ?? 0, shares: r.shares?.count ?? 0 };
}

/** Likes and comments on an Instagram post. */
export async function instagramMetrics(mediaId: string, token: string): Promise<Metrics> {
  const r = await graph<{ like_count?: number; comments_count?: number }>(mediaId, {
    token,
    network: "Instagram",
    params: { fields: "like_count,comments_count" },
  });
  return { likes: r.like_count ?? 0, comments: r.comments_count ?? 0, shares: null };
}
