import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from a
// client component — it bypasses RLS entirely, which is fine here because
// this is a single-user app gated by the passcode middleware, and every
// Supabase call happens inside server actions / route handlers.
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
