import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, hashPasscode, sessionTokenFor } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Abuse guard: 5 signups per IP per 10 minutes.
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;
const MIN_PASSWORD = 8;
// Cap length so a giant password can't tie up the CPU in scrypt (DoS).
const MAX_PASSWORD = 128;

function fail(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("mode", "signup");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function signIn(request: NextRequest, userId: string, dest: string) {
  const response = NextResponse.redirect(new URL(dest, request.url), { status: 303 });
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
  if (!rateLimit(`register:${clientIp(request)}`, LIMIT, WINDOW_MS).ok) {
    return fail(request, "rate");
  }

  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || formData.get("passcode") || "");

  if (!name || name.length > 40) return fail(request, "name");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(request, "email");
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return fail(request, "short");

  const supabase = createServerClient();

  // Every signup gets its own isolated account and its own onboarding —
  // no shared "owner" data, no mixing between users.
  const { data: user, error } = await supabase
    .from("app_users")
    .insert({ name, email, passcode_hash: hashPasscode(password) })
    .select("id")
    .single();

  if (error || !user) {
    return fail(request, error?.code === "23505" ? "taken" : "1");
  }

  // Fresh account: straight to onboarding so Leo learns who they are.
  return signIn(request, user.id, "/onboarding");
}
