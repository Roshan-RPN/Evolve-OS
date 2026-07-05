import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, userIdFromToken } from "@/lib/auth";

// Current profile's id, from the signed session cookie. Every server action
// scopes its Supabase queries with this.
export async function getUserId(): Promise<string> {
  const store = await cookies();
  const userId = userIdFromToken(store.get(AUTH_COOKIE_NAME)?.value);
  if (!userId) redirect("/login");
  return userId;
}
