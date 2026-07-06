import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, userIdFromToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (userIdFromToken(session)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|api/cron|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons).*)",
  ],
};
