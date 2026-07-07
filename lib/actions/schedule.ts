"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { generateDaySchedule } from "@/lib/ai/coach";
import { todayISO, weekKeyOf, weekDates, prettyISO } from "@/lib/date";

export type ScheduleItem = { time: string; block: string; color?: string; priority?: number };

export async function getScheduleForDate(date: string): Promise<{ items: ScheduleItem[]; date: string }> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("plans")
    .select("schedule")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  const items = Array.isArray(data?.schedule) ? (data!.schedule as ScheduleItem[]) : [];
  return { items, date };
}

export async function getTodaySchedule(): Promise<{ items: ScheduleItem[]; date: string }> {
  return getScheduleForDate(todayISO());
}

function sortItems(items: ScheduleItem[]): ScheduleItem[] {
  return [...items].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

export async function saveSchedule(
  date: string,
  items: ScheduleItem[]
): Promise<{ items: ScheduleItem[] }> {
  const userId = await getUserId();
  const supabase = createServerClient();
  // Never write a future date; fall back to today if none/invalid.
  const target = date && date <= todayISO() ? date : todayISO();
  const clean = sortItems(items.filter((i) => i.time || i.block));
  await supabase.from("plans").upsert(
    { user_id: userId, date: target, schedule: clean, updated_at: new Date().toISOString() },
    { onConflict: "user_id,date" }
  );
  return { items: clean };
}

/**
 * Ask Leo to build a realistic day plan grounded in the user's weekly plan for
 * that day, this month's goals, and their honest profile (energy pattern,
 * consistency, wake-up trouble). Returns blocks for the client to review/save —
 * it does NOT persist, so the user can still edit before it sticks.
 */
export async function planDayWithLeo(date: string): Promise<ScheduleItem[]> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const target = date && date <= todayISO() ? date : todayISO();
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);

  // This day's tasks from the weekly plan (goal + action).
  const weekKey = weekKeyOf(target);
  const dayMeta = weekDates(weekKey).find((d) => d.date === target);
  let weekTasks: string[] = [];
  if (dayMeta) {
    const { data } = await supabase
      .from("goals")
      .select("content, action")
      .eq("user_id", userId)
      .eq("level", "weekly")
      .eq("period", weekKey)
      .eq("day_index", dayMeta.dayIndex)
      .order("rank", { ascending: true });
    weekTasks = ((data ?? []) as { content: string; action: string | null }[]).map((g) =>
      g.action?.trim() ? `${g.content} — ${g.action}` : g.content
    );
  }

  // This month's goals the day should serve.
  const monthKey = target.slice(0, 7);
  const { data: mData } = await supabase
    .from("goals")
    .select("content")
    .eq("user_id", userId)
    .eq("level", "monthly")
    .eq("period", monthKey)
    .order("rank", { ascending: true });
  const monthGoals = ((mData ?? []) as { content: string }[]).map((g) => g.content);

  // Blocks already on the day — Leo keeps and works around them.
  const { data: plan } = await supabase
    .from("plans")
    .select("schedule")
    .eq("user_id", userId)
    .eq("date", target)
    .maybeSingle();
  const existing = Array.isArray(plan?.schedule) ? (plan!.schedule as ScheduleItem[]) : [];

  const weekday = new Date(target + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });

  const blocks = await generateDaySchedule({
    identity,
    profile,
    weekday,
    dateLabel: prettyISO(target),
    weekTasks,
    monthGoals,
    existing: existing.map((e) => ({ time: e.time, block: e.block })),
  });

  return blocks.map((b) => ({ time: b.time, block: b.block, priority: b.priority }));
}
