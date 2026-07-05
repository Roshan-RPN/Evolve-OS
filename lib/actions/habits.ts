"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { todayISO } from "@/lib/date";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { suggestHabits, type SuggestedHabit } from "@/lib/ai/coach";
import { revalidatePath } from "next/cache";

const STRETCH_STREAK_THRESHOLD = 10; // consecutive days before offering to stack the next habit
const HEATMAP_DAYS = 14;

export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export type Habit = {
  id: string;
  name: string;
  type: "identity" | "stretch" | "backlog";
  status: "active" | "backlog" | "archived";
  streak: number;
  best_streak: number;
  sort_order: number;
  anchor: string | null;
  time_of_day: TimeOfDay;
  origin: "self" | "leo";
  target_minutes: number | null;
  icon?: string | null; // key from lib/habit-icons.ts; absent pre-migration-0007
  color?: string | null; // key from lib/habit-colors.ts; absent pre-migration-0011
};

async function recomputeStreak(habitId: string) {
  const supabase = createServerClient();
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("date, completed")
    .eq("habit_id", habitId)
    .order("date", { ascending: false })
    .limit(60);

  let streak = 0;
  if (logs) {
    const cursor = new Date(todayISO() + "T00:00:00Z");
    for (let i = 0; i < logs.length; i++) {
      const expected = cursor.toISOString().slice(0, 10);
      const log = logs.find((l) => l.date === expected);
      if (log?.completed) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  const { data: habit } = await supabase.from("habits").select("best_streak").eq("id", habitId).single();
  const bestStreak = Math.max(habit?.best_streak ?? 0, streak);

  await supabase.from("habits").update({ streak, best_streak: bestStreak }).eq("id", habitId);
  return streak;
}

// Last-14-day completion window per habit, for the streak dot row.
function lastDays(n: number): string[] {
  const out: string[] = [];
  const cursor = new Date(todayISO() + "T00:00:00Z");
  for (let i = 0; i < n; i++) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out.reverse(); // oldest → newest
}

export async function getHabitDashboard() {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("sort_order", { ascending: true });

  // Try to pull today's minutes too; tolerate the column not existing yet
  // (before migration 0006 is applied) by falling back to the minutes-less shape.
  let todayLogs: { habit_id: string; completed: boolean; minutes?: number | null }[] = [];
  const withMin = await supabase
    .from("habit_logs")
    .select("habit_id, completed, minutes")
    .eq("user_id", userId)
    .eq("date", date);
  if (withMin.error) {
    const { data } = await supabase
      .from("habit_logs")
      .select("habit_id, completed")
      .eq("user_id", userId)
      .eq("date", date);
    todayLogs = (data || []) as typeof todayLogs;
  } else {
    todayLogs = (withMin.data || []) as typeof todayLogs;
  }
  const completedToday = new Set(todayLogs.filter((l) => l.completed).map((l) => l.habit_id));
  const minutesToday: Record<string, number> = {};
  for (const l of todayLogs) {
    if (typeof l.minutes === "number") minutesToday[l.habit_id as string] = l.minutes;
  }

  // Completion heatmap for the last 14 days across all habits.
  const window = lastDays(HEATMAP_DAYS);
  const { data: recentLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, date, completed")
    .eq("user_id", userId)
    .gte("date", window[0]);
  const doneByHabit = new Map<string, Set<string>>();
  for (const l of recentLogs || []) {
    if (!l.completed) continue;
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set());
    doneByHabit.get(l.habit_id)!.add(l.date as string);
  }
  const heatmap: Record<string, boolean[]> = {};
  for (const h of habits || []) {
    const done = doneByHabit.get(h.id) ?? new Set<string>();
    heatmap[h.id] = window.map((d) => done.has(d));
  }

  const all = (habits || []) as Habit[];
  return {
    habits: all.filter((h) => h.status !== "backlog"),
    backlog: all.filter((h) => h.status === "backlog"),
    completedToday,
    minutesToday,
    heatmap,
    // kept for back-compat with any older callers
    identityHabits: all.filter((h) => h.type === "identity"),
    activeStretch: all.find((h) => h.type === "stretch" && h.status === "active") || null,
  };
}

type AddHabitOptions = {
  type?: "identity" | "stretch" | "backlog";
  anchor?: string;
  time_of_day?: TimeOfDay;
  origin?: "self" | "leo";
  icon?: string | null;
  color?: string | null;
};

export async function addHabit(name: string, opts: AddHabitOptions = {}) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const type = opts.type ?? "identity";
  const base = {
    user_id: userId,
    name,
    type,
    status: type === "backlog" ? "backlog" : "active",
    anchor: opts.anchor?.trim() || null,
    time_of_day: opts.time_of_day ?? "anytime",
    origin: opts.origin ?? "self",
  };
  // Include icon/colour when chosen; if a column doesn't exist yet (pre-0007 / pre-0011),
  // retry without the extras so the habit still saves.
  const extras = { ...(opts.icon ? { icon: opts.icon } : null), ...(opts.color ? { color: opts.color } : null) };
  const { error } = await supabase.from("habits").insert({ ...base, ...extras });
  if (error && Object.keys(extras).length > 0) {
    await supabase.from("habits").insert(base);
  }
  revalidatePath("/habits");
}

export async function suggestHabitsForVision(): Promise<SuggestedHabit[]> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const [identity, profile, { data: habits }] = await Promise.all([
    getIdentity(),
    getProfile(),
    supabase.from("habits").select("name").eq("user_id", userId).neq("status", "archived"),
  ]);
  const existing = (habits || []).map((h) => h.name as string);
  return suggestHabits({ identity, profile, existing });
}

export async function toggleHabitToday(habitId: string, completed: boolean, minutes?: number | null) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const base = { user_id: userId, habit_id: habitId, date, completed, source: "manual" };
  // Include minutes when provided; if the column doesn't exist yet (pre-0006),
  // retry without it so completion still logs.
  const row = minutes === undefined ? base : { ...base, minutes: completed ? minutes : null };
  const { error } = await supabase.from("habit_logs").upsert(row, { onConflict: "habit_id,date" });
  if (error && minutes !== undefined) {
    await supabase.from("habit_logs").upsert(base, { onConflict: "habit_id,date" });
  }
  await recomputeStreak(habitId);
  revalidatePath("/habits");
  revalidatePath("/analytics");
}

/** Set/replace minutes on today's log for a habit (habit must already be done). */
export async function logHabitMinutes(habitId: string, minutes: number | null) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const { error } = await supabase
    .from("habit_logs")
    .upsert(
      { user_id: userId, habit_id: habitId, date, completed: true, source: "manual", minutes },
      { onConflict: "habit_id,date" }
    );
  if (error) return { ok: false as const }; // column missing → caller shows a hint
  revalidatePath("/habits");
  revalidatePath("/analytics");
  return { ok: true as const };
}

export async function promoteNextStretchHabit() {
  const supabase = createServerClient();
  const { activeStretch, backlog } = await getHabitDashboard();

  if (activeStretch && activeStretch.streak < STRETCH_STREAK_THRESHOLD) {
    return {
      promoted: false,
      message: `"${activeStretch.name}" is only at a ${activeStretch.streak}-day streak. Get it to ${STRETCH_STREAK_THRESHOLD} consistent days before stacking anything new — that inconsistency gets fixed first, not buried under another habit.`,
    };
  }

  if (activeStretch) {
    await supabase.from("habits").update({ type: "identity" }).eq("id", activeStretch.id);
  }

  const next = backlog[0];
  if (!next) {
    return {
      promoted: Boolean(activeStretch),
      message: activeStretch
        ? `"${activeStretch.name}" is now a locked-in identity habit. Your backlog is empty — add the next one when you're ready.`
        : "No active stretch habit and nothing in the backlog yet.",
    };
  }

  await supabase.from("habits").update({ type: "stretch", status: "active" }).eq("id", next.id);
  revalidatePath("/habits");
  return {
    promoted: true,
    message: activeStretch
      ? `"${activeStretch.name}" graduated to a locked-in identity habit. "${next.name}" is now your active stretch habit.`
      : `"${next.name}" is now your active stretch habit.`,
  };
}
