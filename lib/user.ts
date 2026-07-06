import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AUTH_COOKIE_NAME, userIdFromToken } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

// Current profile's id, from the signed session cookie. Every server action
// scopes its Supabase queries with this.
//
// Wrapped in React `cache` so the existence check below runs at most once per
// request even though a single page fires many actions that each call this.
export const getUserId = cache(async function getUserId(): Promise<string> {
  const store = await cookies();
  const userId = userIdFromToken(store.get(AUTH_COOKIE_NAME)?.value);
  if (!userId) redirect("/login");

  // A valid signature is not enough — the account it points to can be gone
  // (e.g. the app_users row was deleted). Without this check a stale cookie
  // looks logged in: the app shows onboarding, then every save FK-violates
  // against the missing user_id and hangs on "Saving...". Treat a dead
  // session as logged out and send the user back to sign in.
  const supabase = createServerClient();
  const { data } = await supabase.from("app_users").select("id").eq("id", userId).maybeSingle();
  if (!data) redirect("/login");

  return userId;
});
