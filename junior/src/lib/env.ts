// Central place for configuration. Server-only values are read lazily so a
// missing key fails the feature that needs it, not the whole app.

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

export function supabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  return key;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Junior's own Claude key. JUNIOR_ANTHROPIC_API_KEY comes first so a key meant
 * for the app is never confused with one a developer tool on the same machine
 * uses. ANTHROPIC_API_KEY is the usual name on a host such as Vercel.
 */
export function anthropicApiKey(): string | undefined {
  return process.env.JUNIOR_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || undefined;
}

/** Always the public API unless Junior is told otherwise (tests use a mock). */
export function anthropicBaseUrl(): string {
  return process.env.JUNIOR_ANTHROPIC_BASE_URL || "https://api.anthropic.com";
}

export function anthropicConfigured(): boolean {
  return Boolean(anthropicApiKey());
}

/** Placeholder drafts for local development without an Anthropic key. */
export function demoDraftsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.JUNIOR_DEMO_DRAFTS === "1" &&
    !anthropicConfigured()
  );
}

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
