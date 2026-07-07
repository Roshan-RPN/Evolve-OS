import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { constantTimeEqual } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push-server";
import { createCheckinsFromTodayPlan } from "@/lib/actions/checkins";
import { todayISO } from "@/lib/date";

// Hit by an external cron scheduler (e.g. cron-job.org) at set times:
//   /api/cron/reminders?type=morning&secret=...   ~7am
//   /api/cron/reminders?type=checkin&secret=...    a few times midday
//   /api/cron/reminders?type=afternoon&secret=...  ~2pm (midday reset journal)
//   /api/cron/reminders?type=evening&secret=...     ~9pm
//   /api/cron/reminders?type=weekly-audit&secret=... Sundays
//   /api/cron/reminders?type=test&secret=...        on-demand: pushes to every
//     device right now (ignores all gates) so delivery can be verified.
// Runs without a session cookie, so it fans out over every profile and
// pushes only to that profile's own devices.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const type = searchParams.get("type");

  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || !constantTimeEqual(secret, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const date = todayISO();
  const { data: users } = await supabase.from("app_users").select("id");
  const userIds = (users ?? []).map((u) => u.id);

  // On-demand delivery test: ignores every gate, pushes to all devices now, and
  // reports how many subscriptions each user has, how many pushes went out, and
  // any errors. Hit this URL in a browser to verify notifications actually work.
  if (type === "test") {
    const results: Record<string, unknown>[] = [];
    let totalSubs = 0;
    let totalSent = 0;
    for (const userId of userIds) {
      const r = await sendPushToUser(userId, {
        title: "Test notification",
        body: "If you can see this, push notifications work on this device.",
        url: "/",
      });
      totalSubs += r.subs;
      totalSent += r.sent;
      results.push({ userId, ...r });
    }
    return NextResponse.json({ ok: true, users: userIds.length, totalSubs, totalSent, results });
  }

  if (type === "morning") {
    for (const userId of userIds) {
      const { data: plan } = await supabase
        .from("plans")
        .select("locked")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
      if (!plan?.locked) {
        await sendPushToUser(userId, {
          title: "Morning journal",
          body: "Start your day with affirmations, priorities, and a plan.",
          url: "/morning",
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "afternoon") {
    let sent = 0;
    let skipped = 0;
    for (const userId of userIds) {
      const { data: journal } = await supabase
        .from("journal_entries")
        .select("afternoon")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
      if (!journal?.afternoon) {
        const r = await sendPushToUser(userId, {
          title: "Midday reset",
          body: "Half the day's still yours. Check where your priorities stand and refocus.",
          url: "/afternoon",
        });
        sent += r.sent;
      } else {
        // Already journaled today — nothing to remind. This is why a 3pm run can
        // legitimately deliver nothing: the reminder is only sent if it's unfilled.
        skipped++;
      }
    }
    return NextResponse.json({ ok: true, sent, skippedAlreadyDone: skipped });
  }

  if (type === "evening") {
    for (const userId of userIds) {
      const { data: journal } = await supabase
        .from("journal_entries")
        .select("evening")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
      if (!journal?.evening) {
        await sendPushToUser(userId, {
          title: "Evening journal",
          body: "Close out the day and get tonight's realization dose.",
          url: "/evening",
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "checkin") {
    let sent = 0;
    for (const userId of userIds) {
      await createCheckinsFromTodayPlan(userId);
      const { data: pending } = await supabase
        .from("checkins")
        .select("id, prompt")
        .eq("user_id", userId)
        .eq("date", date)
        .is("response", null);

      for (const c of pending || []) {
        await sendPushToUser(userId, { title: "Quick check-in", body: c.prompt, url: `/checkin/${c.id}` });
        sent++;
      }
    }
    return NextResponse.json({ ok: true, sent });
  }

  return NextResponse.json({ error: "unknown type" }, { status: 400 });
}
