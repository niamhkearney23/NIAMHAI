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

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
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
