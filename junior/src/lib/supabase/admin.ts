import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Service-role client. Bypasses row level security, so it is only used where
 * there is no user session (the publisher) or for columns users may not touch
 * (encrypted tokens), always after the caller's identity has been checked.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createSupabaseClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
