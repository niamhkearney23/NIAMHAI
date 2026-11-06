import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { MetaPage } from "@/lib/platforms/meta";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Provider = "facebook" | "instagram" | "linkedin";

export interface ConnectionSummary {
  provider: Provider;
  status: "active" | "pending" | "expired";
  display_name: string;
  external_id: string | null;
  token_expires_at: string | null;
  connected_at: string;
}

export type Connections = Record<Provider, ConnectionSummary | null>;

// Ties each ciphertext to its owner and provider (AES-GCM associated data).
const context = (userId: string, provider: Provider, kind = "token") => `${userId}:${provider}:${kind}`;

/** What the signed-in lawyer has connected. Never includes tokens. */
export async function listConnections(): Promise<Connections> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_connections")
    .select("provider, status, display_name, external_id, token_expires_at, connected_at");
  const out: Connections = { facebook: null, instagram: null, linkedin: null };
  for (const row of (data ?? []) as ConnectionSummary[]) out[row.provider] = row;
  return out;
}

export async function saveConnection(
  userId: string,
  provider: Provider,
  c: { externalId: string; displayName: string; token: string; expiresAt?: Date | null; scopes?: string[] },
) {
  const admin = createAdminClient();
  const { error } = await admin.from("social_connections").upsert(
    {
      user_id: userId,
      provider,
      status: "active",
      external_id: c.externalId,
      display_name: c.displayName.slice(0, 200),
      token_ciphertext: encryptSecret(c.token, context(userId, provider)),
      token_expires_at: c.expiresAt?.toISOString() ?? null,
      pending_ciphertext: null,
      scopes: c.scopes ?? [],
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(`Could not save the ${provider} connection: ${error.message}`);
}

export async function removeConnection(userId: string, provider: Provider) {
  const admin = createAdminClient();
  const providers: Provider[] = provider === "facebook" ? ["facebook", "instagram"] : [provider];
  const { error } = await admin.from("social_connections").delete().eq("user_id", userId).in("provider", providers);
  if (error) throw new Error(`Could not disconnect ${provider}: ${error.message}`);
}

/** Several Pages: keep them, encrypted, until the lawyer picks one. */
export async function savePendingPages(userId: string, pages: MetaPage[], scopes: string[]) {
  const admin = createAdminClient();
  const { error } = await admin.from("social_connections").upsert(
    {
      user_id: userId,
      provider: "facebook",
      status: "pending",
      external_id: null,
      display_name: "",
      token_ciphertext: null,
      pending_ciphertext: encryptSecret(JSON.stringify(pages), context(userId, "facebook", "pending")),
      scopes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(`Could not save the Facebook Pages: ${error.message}`);
}

export async function readPendingPages(userId: string): Promise<{ pages: MetaPage[]; scopes: string[] } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("social_connections")
    .select("pending_ciphertext, scopes")
    .eq("user_id", userId)
    .eq("provider", "facebook")
    .eq("status", "pending")
    .maybeSingle();
  if (!data?.pending_ciphertext) return null;
  return { pages: JSON.parse(decryptSecret(data.pending_ciphertext, context(userId, "facebook", "pending"))), scopes: data.scopes ?? [] };
}

/** Save the chosen Page, and its linked Instagram account if there is one. */
export async function connectPage(userId: string, page: MetaPage, scopes: string[]) {
  await saveConnection(userId, "facebook", { externalId: page.id, displayName: page.name, token: page.accessToken, scopes });
  if (page.instagram) {
    await saveConnection(userId, "instagram", {
      externalId: page.instagram.id,
      displayName: page.instagram.username ? `@${page.instagram.username}` : page.name,
      token: page.accessToken,
      scopes,
    });
  } else {
    const admin = createAdminClient();
    await admin.from("social_connections").delete().eq("user_id", userId).eq("provider", "instagram");
  }
}

/** For the publisher only. */
export async function tokenFor(userId: string, provider: Provider) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("social_connections")
    .select("external_id, display_name, token_ciphertext, token_expires_at, status")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data?.token_ciphertext || data.status !== "active" || !data.external_id) return null;
  return {
    externalId: data.external_id as string,
    displayName: data.display_name as string,
    expiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
    token: decryptSecret(data.token_ciphertext, context(userId, provider)),
  };
}

export async function markExpired(userId: string, provider: Provider) {
  const admin = createAdminClient();
  const providers: Provider[] = provider === "facebook" || provider === "instagram" ? ["facebook", "instagram"] : [provider];
  await admin
    .from("social_connections")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("provider", providers);
}
