#!/usr/bin/env node
// Local stand-ins for the Facebook Graph API, Facebook Login, LinkedIn OAuth
// and the LinkedIn Posts API. For development and tests only: it lets you run
// the whole connect-and-publish flow without real developer apps.
//
//   node scripts/mock-platforms.mjs            # http://localhost:4010
//   open http://localhost:4010/__mock/feed     # what was "published"
//
// Point the app at it with META_GRAPH_URL, META_DIALOG_URL, LINKEDIN_API_URL
// and LINKEDIN_OAUTH_URL set to http://localhost:4010, and META_APP_SECRET /
// LINKEDIN_CLIENT_SECRET set to "mock-secret".

import http from "node:http";
import { fileURLToPath } from "node:url";

const SECRET = "mock-secret";

function state() {
  return {
    pages: [
      { id: "1001", name: "Rahman & Co", access_token: "PAGE_TOKEN_1001", ig: { id: "17841400000000001", username: "rahmanandco" } },
      { id: "1002", name: "Rahman & Co Careers", access_token: "PAGE_TOKEN_1002", ig: null },
    ],
    containers: new Map(),
    posts: [],
    failNext: null,
    seq: 1,
  };
}

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};
const graphError = (res, message, code, status = 400) => json(res, status, { error: { message, type: "OAuthException", code } });

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const type = req.headers["content-type"] ?? "";
  if (type.includes("application/json")) return raw ? JSON.parse(raw) : {};
  return Object.fromEntries(new URLSearchParams(raw));
}

function consentPage(title, who, scopes, approveUrl, denyUrl) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title>
<body style="font-family:system-ui;background:#f0f2f5;display:grid;place-items:center;min-height:100vh;margin:0">
<main style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:28px;max-width:420px">
<p style="font-size:12px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em">Local mock, not the real site</p>
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
<p>Junior by Lawgistics wants to:</p><ul>${scopes.map((s) => `<li>${s}</li>`).join("")}</ul>
<p>Signed in as <b>${who}</b></p>
<p style="display:flex;gap:8px;margin-top:20px"><a id="approve" href="${approveUrl}" style="background:#1b74e4;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Continue</a>
<a id="deny" href="${denyUrl}" style="padding:10px 16px;color:#333">Cancel</a></p></main></body>`;
}

function unLittle(text) {
  return text.replace(/\{hashtag\|\\#\|([^}]+)\}/g, "#$1").replace(/\\(.)/g, "$1");
}

function feedPage(posts) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const items = posts
    .slice()
    .reverse()
    .map(
      (p) => `<article id="${esc(p.id)}" style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:18px;margin:0 0 16px">
<p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.08em">${esc(p.network)} · ${esc(p.where)} · ${esc(p.at)}</p>
<div style="white-space:pre-wrap;line-height:1.5">${esc(p.text)}</div>
${p.images?.length ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-top:12px">${p.images.map((src) => `<img src="${src}" style="width:216px;height:270px;border-radius:4px;border:1px solid #ddd">`).join("")}</div>` : ""}
</article>`,
    )
    .join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Mock feed</title>
<body style="font-family:system-ui;background:#f0f2f5;margin:0;padding:24px"><main style="max-width:720px;margin:0 auto">
<p style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.08em">Local mock platforms</p>
<h1 style="margin:0 0 20px;font-size:22px">What Junior published (${posts.length})</h1>${items || "<p>Nothing yet.</p>"}</main></body>`;
}

export function startMockPlatforms({ port = 4010, host = "127.0.0.1" } = {}) {
  const s = state();
  const base = () => `http://localhost:${server.address().port}`;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const path = url.pathname;
      const q = Object.fromEntries(url.searchParams);
      const body = req.method === "POST" ? await readBody(req) : {};
      const p = { ...q, ...body };

      // ---- Test controls
      if (path === "/__mock/feed") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(feedPage(s.posts));
      }
      if (path === "/__mock/posts") return json(res, 200, s.posts.map(({ images, ...rest }) => ({ ...rest, images: images?.length ?? 0 })));
      if (path === "/__mock/fail-next") {
        s.failNext = { network: q.network, status: Number(q.status ?? 503) };
        return json(res, 200, { ok: true });
      }
      if (path === "/__mock/reset") {
        Object.assign(s, state());
        return json(res, 200, { ok: true });
      }

      const failIf = (network) => {
        if (s.failNext?.network === network) {
          const { status } = s.failNext;
          s.failNext = null;
          if (network === "linkedin") json(res, status, { message: "Service unavailable (mock)", status });
          else graphError(res, "An unexpected error has occurred. Please retry your request later. (mock)", 2, status);
          return true;
        }
        return false;
      };

      // ---- LinkedIn
      if (path === "/oauth/v2/authorization") {
        const back = new URL(q.redirect_uri);
        back.searchParams.set("state", q.state);
        const deny = new URL(back);
        back.searchParams.set("code", "LI_CODE");
        deny.searchParams.set("error", "user_cancelled_login");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(consentPage("LinkedIn (mock)", "Nur Aisyah Rahman", ["Use your name and photo", "Create posts on your behalf"], back, deny));
      }
      if (path === "/oauth/v2/accessToken" && req.method === "POST") {
        if (p.client_secret !== SECRET || p.code !== "LI_CODE") return json(res, 400, { error: "invalid_request" });
        return json(res, 200, { access_token: "LI_TOKEN", expires_in: 5184000, scope: "openid,profile,w_member_social" });
      }
      if (path === "/v2/userinfo") {
        if (req.headers.authorization !== "Bearer LI_TOKEN") return json(res, 401, { message: "Invalid access token" });
        return json(res, 200, { sub: "aB3xYz", name: "Nur Aisyah Rahman" });
      }
      if (path === "/rest/posts" && req.method === "POST") {
        if (failIf("linkedin")) return;
        if (req.headers.authorization !== "Bearer LI_TOKEN") return json(res, 401, { message: "Invalid access token" });
        if (!/^\d{6}$/.test(req.headers["linkedin-version"] ?? "") || req.headers["x-restli-protocol-version"] !== "2.0.0") {
          return json(res, 400, { message: "Missing LinkedIn-Version or X-Restli-Protocol-Version header" });
        }
        if (body.author !== "urn:li:person:aB3xYz" || body.lifecycleState !== "PUBLISHED" || !body.commentary) {
          return json(res, 422, { message: "Invalid post body" });
        }
        const id = `urn:li:share:7${String(s.seq++).padStart(18, "0")}`;
        s.posts.push({ id, network: "LinkedIn", where: "Nur Aisyah Rahman", at: new Date().toISOString(), text: unLittle(body.commentary) });
        res.writeHead(201, { "x-restli-id": id });
        return res.end();
      }

      // ---- Facebook / Instagram
      const m = path.match(/^\/v\d+\.\d+\/(.+)$/);
      if (!m) return json(res, 404, { error: "not found" });
      const rest = m[1];

      if (rest === "dialog/oauth") {
        const back = new URL(q.redirect_uri);
        back.searchParams.set("state", q.state);
        const deny = new URL(back);
        back.searchParams.set("code", "META_CODE");
        deny.searchParams.set("error", "access_denied");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(consentPage("Facebook (mock)", "Nur Aisyah Rahman", (q.scope ?? "").split(","), back, deny));
      }
      if (rest === "oauth/access_token") {
        if (p.client_secret !== SECRET) return graphError(res, "Error validating client secret.", 1);
        if (p.grant_type === "fb_exchange_token") {
          return p.fb_exchange_token === "SHORT_USER"
            ? json(res, 200, { access_token: "LONG_USER", token_type: "bearer", expires_in: 5184000 })
            : graphError(res, "Invalid OAuth access token.", 190);
        }
        return p.code === "META_CODE"
          ? json(res, 200, { access_token: "SHORT_USER", token_type: "bearer", expires_in: 3600 })
          : graphError(res, "Invalid verification code format.", 100);
      }

      const token = p.access_token;
      if (rest === "me/permissions") {
        if (token !== "LONG_USER") return graphError(res, "Invalid OAuth access token.", 190);
        return json(res, 200, {
          data: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "business_management"].map(
            (permission) => ({ permission, status: "granted" }),
          ),
        });
      }
      if (rest === "me/accounts") {
        if (token !== "LONG_USER") return graphError(res, "Invalid OAuth access token.", 190);
        return json(res, 200, {
          data: s.pages.map((pg) => ({
            id: pg.id,
            name: pg.name,
            access_token: pg.access_token,
            ...(pg.ig ? { instagram_business_account: { id: pg.ig.id, username: pg.ig.username } } : {}),
          })),
        });
      }

      const feed = rest.match(/^(\d+)\/feed$/);
      if (feed && req.method === "POST") {
        if (failIf("facebook")) return;
        const page = s.pages.find((pg) => pg.id === feed[1]);
        if (!page || token !== page.access_token) return graphError(res, "Invalid OAuth access token.", 190);
        if (!p.message) return graphError(res, "(#100) Missing message", 100);
        const id = `${page.id}_${s.seq++}`;
        s.posts.push({ id, network: "Facebook", where: page.name, at: new Date().toISOString(), text: p.message });
        return json(res, 200, { id });
      }

      const igPage = (igId) => s.pages.find((pg) => pg.ig?.id === igId);
      const media = rest.match(/^(\d+)\/media$/);
      if (media && req.method === "POST") {
        if (failIf("instagram")) return;
        const page = igPage(media[1]);
        if (!page || token !== page.access_token) return graphError(res, "Invalid OAuth access token.", 190);
        const id = `c${s.seq++}`;
        if (p.is_carousel_item === "true") {
          // Like Instagram, fetch the image and insist on a JPEG.
          const img = await fetch(p.image_url).catch(() => null);
          const bytes = img?.ok ? Buffer.from(await img.arrayBuffer()) : null;
          if (!bytes || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
            return graphError(res, "Only photo or video can be accepted as media type. (mock: image must be a reachable JPEG)", 9004);
          }
          s.containers.set(id, { kind: "item", image: `data:image/jpeg;base64,${bytes.toString("base64")}`, polls: 0 });
          return json(res, 200, { id });
        }
        if (p.media_type === "CAROUSEL") {
          const children = String(p.children ?? "").split(",").filter(Boolean);
          if (children.length < 2 || children.some((c) => s.containers.get(c)?.kind !== "item")) {
            return graphError(res, "Invalid carousel children", 100);
          }
          s.containers.set(id, { kind: "carousel", children, caption: p.caption ?? "", ig: page.ig, polls: 0 });
          return json(res, 200, { id });
        }
        return graphError(res, "Unsupported media", 100);
      }

      const publish = rest.match(/^(\d+)\/media_publish$/);
      if (publish && req.method === "POST") {
        const page = igPage(publish[1]);
        const c = s.containers.get(p.creation_id);
        if (!page || token !== page.access_token) return graphError(res, "Invalid OAuth access token.", 190);
        if (c?.kind !== "carousel") return graphError(res, "Media ID is not available", 9007);
        const id = `1790${s.seq++}`;
        s.posts.push({
          id,
          network: "Instagram",
          where: `@${c.ig.username}`,
          at: new Date().toISOString(),
          text: c.caption,
          images: c.children.map((ch) => s.containers.get(ch).image),
        });
        return json(res, 200, { id });
      }

      // GET /{id}?fields=...
      if (req.method === "GET" && /^[\w]+$/.test(rest)) {
        const c = s.containers.get(rest);
        if (c && q.fields === "status_code") {
          c.polls++;
          return json(res, 200, { status_code: c.polls < 2 ? "IN_PROGRESS" : "FINISHED", id: rest });
        }
        const post = s.posts.find((x) => x.id === rest);
        if (post) {
          const link = `${base()}/__mock/feed#${rest}`;
          return json(res, 200, q.fields === "permalink" ? { permalink: link, id: rest } : { permalink_url: link, id: rest });
        }
      }
      return graphError(res, `Unknown path ${rest} (mock)`, 100, 404);
    } catch (err) {
      json(res, 500, { error: { message: String(err), code: 1 } });
    }
  });

  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT ?? 4010);
  startMockPlatforms({ port, host: "0.0.0.0" }).then(() => console.log(`Mock platforms on http://localhost:${port} (feed: /__mock/feed)`));
}
