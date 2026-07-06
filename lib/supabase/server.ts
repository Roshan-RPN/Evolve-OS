import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from a
// client component — it bypasses RLS entirely. Safe here because every call
// happens inside a server action / route handler that first resolves the
// signed-in user via getUserId() and scopes each query by user_id. RLS stays
// ON (migration 0013) purely to lock out the public anon key.
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
