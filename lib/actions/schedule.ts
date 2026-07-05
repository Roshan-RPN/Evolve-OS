"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { todayISO } from "@/lib/date";

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
