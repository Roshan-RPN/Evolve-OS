import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { AUTH_COOKIE_NAME, userIdFromToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = userIdFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const subscription = await request.json();
  const supabase = createServerClient();

  // A device belongs to whichever profile subscribed from it most recently.
  await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
      user_id: userId,
    },
    { onConflict: "endpoint" }
  );

  return NextResponse.json({ ok: true });
}
