import "server-only";
import { createHmac } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";

// Settings and small helpers for the free sample.

/** Off switch, in case the bill or the abuse gets out of hand: JUNIOR_SAMPLES=off. */
export function samplesEnabled(): boolean {
  return (process.env.JUNIOR_SAMPLES ?? "on").toLowerCase() !== "off";
}

/** How many samples Junior will write in any 24 hours, in total. */
export function samplesPerDay(): number {
  const n = Number.parseInt(process.env.JUNIOR_SAMPLES_PER_DAY ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 30;
}

/** Requests one network may make in an hour, and all networks together (this protects the sending domain). */
export const SAMPLES_PER_IP_PER_HOUR = 5;
export const NEW_REQUESTS_PER_HOUR = 100;
export const MIN_SOURCE_CHARS = 200;
export const MAX_SOURCE_CHARS = 20_000;

/**
 * One sample per person. "Anna.Tan+x@gmail.com" and "annatan@gmail.com" are the
 * same inbox, so they count as the same person.
 */
export function emailKey(email: string): string {
  const [rawLocal = "", rawDomain = ""] = email.trim().toLowerCase().split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  let local = rawLocal.split("+")[0] || rawLocal;
  if (domain === "gmail.com") local = local.replace(/\./g, "") || rawLocal;
  return `${local}@${domain}`;
}

/** The caller's address, from the proxy's headers. Kept only as a keyed hash. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function ipHash(ip: string): string {
  return createHmac("sha256", process.env.TOKEN_ENCRYPTION_KEY || "junior-samples").update(ip).digest("hex").slice(0, 32);
}

/** Samples written, or being written, in the last 24 hours. */
export async function samplesToday(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [done, running] = await Promise.all([
    admin.from("sample_requests").select("id", { count: "exact", head: true }).gte("drafted_at", since),
    admin
      .from("sample_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "drafting")
      .gte("updated_at", new Date(Date.now() - 6 * 60_000).toISOString()),
  ]);
  return (done.count ?? 0) + (running.count ?? 0);
}

/** A run that has been "drafting" for longer than this died part-way. */
export function isStaleRun(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > 6 * 60_000;
}
