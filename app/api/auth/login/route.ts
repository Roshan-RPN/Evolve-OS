import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, OWNER_USER_ID, sessionTokenFor, verifyPasscode } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

function fail(request: NextRequest, next: string, user?: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "1");
  url.searchParams.set("next", next);
  if (user) url.searchParams.set("u", user);
  return NextResponse.redirect(url, { status: 303 });
}

function sessionResponse(request: NextRequest, next: string, userId: string) {
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(AUTH_COOKIE_NAME, sessionTokenFor(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || formData.get("passcode") || "");
  const next = String(formData.get("next") || "/");
  const userId = String(formData.get("user") || "");

  // Standard login: look the account up by email, check the password.
  if (email) {
    const supabase = createServerClient();
    const { data: user } = await supabase
      .from("app_users")
      .select("id, passcode_hash")
      .ilike("email", email)
      .maybeSingle();
    if (!user || !verifyPasscode(password, user.passcode_hash)) return fail(request, next);
    return sessionResponse(request, next, user.id);
  }

  // --- Legacy fallbacks: keep old sessions/owner working ---
  // No profile picked — pre-migration form. Verify against the env passcode
  // and sign in as the owner profile.
  if (!userId) {
    if (password !== process.env.APP_PASSCODE) return fail(request, next);
    return sessionResponse(request, next, OWNER_USER_ID);
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("app_users")
    .select("id, passcode_hash")
    .eq("id", userId)
    .maybeSingle();

  if (!user || !verifyPasscode(password, user.passcode_hash)) {
    return fail(request, next, userId);
  }
  return sessionResponse(request, next, user.id);
}
