"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { suggestGoals, evaluateWeekPlan, monthOutlook, visionFeedback } from "@/lib/ai/coach";
import {
  periodThreeYear,
  periodYear,
  periodMonth,
  periodWeek,
  prettyMonth,
  prettyWeek,
  shortMonth,
  weekDates,
  monthPeriodsForYear,
  shiftWeekPeriod,
} from "@/lib/date";

export type GoalLevel = "three_year" | "yearly" | "monthly" | "weekly";
export type GoalsView = GoalLevel;

export type Goal = {
  id: string;
  level: GoalLevel;
  period: string;
  content: string;
  action: string | null;
  day_index: number | null;
  done: boolean;
  rank: number;
  parent_id: string | null;
};

const GOAL_COLS = "id, level, period, content, action, day_index, done, rank, parent_id";

/** Current period key for a level (what "now" maps to). */
function periodFor(level: GoalLevel): string {
  switch (level) {
    case "three_year":
      return periodThreeYear();
    case "yearly":
      return periodYear();
    case "monthly":
      return periodMonth();
    case "weekly":
      return periodWeek();
  }
}

// ---- Shared, cheap reads ----

export async function getVisions(): Promise<{ three_year: string; one_year: string }> {
  const identity = await getIdentity();
  return {
    three_year: identity?.vision_3_year ?? "",
    one_year: identity?.vision_1_year ?? "",
  };
}

/** Goals for a level at its current period (used by the 3-year and yearly views). */
export async function getLevelGoals(level: GoalLevel): Promise<Goal[]> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("goals")
    .select(GOAL_COLS)
    .eq("user_id", userId)
    .eq("level", level)
    .eq("period", periodFor(level))
    .order("rank", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Goal[];
}

// ---- Monthly view: 12 boxes for the calendar year ----

export type MonthCell = {
  period: string;
  label: string;
  fullLabel: string;
  goals: Goal[];
  done: number;
  total: number;
  pct: number;
  readOnly: boolean;
  isCurrent: boolean;
};

export type MonthlyGrid = {
  year: string;
  months: MonthCell[];
  parentOptions: Goal[]; // yearly goals
  parentLabels: Record<string, string>;
};

export async function getMonthlyGrid(): Promise<MonthlyGrid> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const year = periodYear();
  const curMonth = periodMonth();
  const keys = monthPeriodsForYear(year);

  const [{ data: monthData }, { data: yearData }] = await Promise.all([
    supabase
      .from("goals")
      .select(GOAL_COLS)
      .eq("user_id", userId)
      .eq("level", "monthly")
      .gte("period", `${year}-01`)
      .lte("period", `${year}-12`)
      .order("rank", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("goals")
      .select(GOAL_COLS)
      .eq("user_id", userId)
      .eq("level", "yearly")
      .eq("period", year)
      .order("rank", { ascending: true }),
  ]);

  const byMonth = new Map<string, Goal[]>();
  for (const g of (monthData ?? []) as Goal[]) {
    const arr = byMonth.get(g.period) ?? [];
    arr.push(g);
    byMonth.set(g.period, arr);
  }

  const months: MonthCell[] = keys.map((period) => {
    const goals = byMonth.get(period) ?? [];
    const total = goals.length;
    const done = goals.filter((g) => g.done).length;
    return {
      period,
      label: shortMonth(period),
      fullLabel: prettyMonth(period),
      goals,
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 0,
      readOnly: period < curMonth,
      isCurrent: period === curMonth,
    };
  });

  const parentOptions = (yearData ?? []) as Goal[];
  const parentLabels: Record<string, string> = {};
  for (const g of parentOptions) parentLabels[g.id] = g.content;
  for (const g of (monthData ?? []) as Goal[]) parentLabels[g.id] = g.content;

  return { year, months, parentOptions, parentLabels };
}

// ---- Weekly view: 7 day boxes + evaluation ----

export type WeekTask = {
  id: string;
  goal: string;
  action: string;
  done: boolean;
};

export type WeekDay = {
  dayIndex: number;
  date: string;
  weekday: string;
  tasks: WeekTask[];
  isToday: boolean;
  isPast: boolean;
};

// "use server" files may only export async functions — keep this cap un-exported
// (goals-board mirrors the same limit in its UI).
const MAX_WEEK_TASKS_PER_DAY = 5;

export type WeeklyPlan = {
  period: string;
  label: string;
  isCurrent: boolean;
  readOnly: boolean;
  prevWeek: string;
  nextWeek: string | null;
  days: WeekDay[];
  monthGoals: string[];
  stats: { planned: number; done: number; pct: number; gaps: { weekday: string; goal: string }[] };
  trend: { period: string; pct: number }[];
  verdict: string | null;
};

function computeStats(days: WeekDay[]) {
  const tasks = days.flatMap((d) => d.tasks.map((t) => ({ weekday: d.weekday, ...t })));
  const planned = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const gaps = tasks.filter((t) => !t.done).map((t) => ({ weekday: t.weekday, goal: t.goal }));
  return { planned, done, pct: planned ? Math.round((done / planned) * 100) : 0, gaps };
}

export async function getWeeklyPlan(weekArg?: string): Promise<WeeklyPlan> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const curWeek = periodWeek();
  const period = weekArg && /^\d{4}-W\d{2}$/.test(weekArg) && weekArg <= curWeek ? weekArg : curWeek;
  const isCurrent = period === curWeek;

  const scaffold = weekDates(period);
  const today = periodWeek() === period ? new Date().toISOString().slice(0, 10) : "";

  const { data: rows } = await supabase
    .from("goals")
    .select(GOAL_COLS)
    .eq("user_id", userId)
    .eq("level", "weekly")
    .eq("period", period)
    .not("day_index", "is", null)
    .order("rank", { ascending: true })
    .order("created_at", { ascending: true });

  const byDay = new Map<number, Goal[]>();
  for (const g of (rows ?? []) as Goal[]) {
    if (g.day_index == null) continue;
    const arr = byDay.get(g.day_index) ?? [];
    arr.push(g);
    byDay.set(g.day_index, arr);
  }

  const days: WeekDay[] = scaffold.map((s) => ({
    dayIndex: s.dayIndex,
    date: s.date,
    weekday: s.weekday,
    tasks: (byDay.get(s.dayIndex) ?? []).map((g) => ({
      id: g.id,
      goal: g.content,
      action: g.action ?? "",
      done: g.done,
    })),
    isToday: s.date === today,
    // A day already finished (only meaningful in the live week) can't be planned into.
    isPast: today !== "" && s.date < today,
  }));

  // Month this week feeds — anchor on the ISO week's Thursday.
  const monthKey = scaffold[3].date.slice(0, 7);
  const { data: mGoals } = await supabase
    .from("goals")
    .select("content")
    .eq("user_id", userId)
    .eq("level", "monthly")
    .eq("period", monthKey)
    .order("rank", { ascending: true });
  const monthGoals = ((mGoals ?? []) as { content: string }[]).map((g) => g.content);

  // Trend from prior saved reviews.
  const { data: trendRows } = await supabase
    .from("weekly_reviews")
    .select("period, completion")
    .eq("user_id", userId)
    .lt("period", period)
    .order("period", { ascending: false })
    .limit(6);
  const trend = ((trendRows ?? []) as { period: string; completion: number }[])
    .map((r) => ({ period: r.period, pct: Math.round(Number(r.completion) * 100) }))
    .reverse();

  const stats = computeStats(days);

  // Saved verdict, or lazily auto-evaluate a finished (past) week that has a plan.
  let verdict: string | null = null;
  const { data: review } = await supabase
    .from("weekly_reviews")
    .select("verdict")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();
  if (review?.verdict) {
    verdict = review.verdict as string;
  } else if (!isCurrent && stats.planned > 0) {
    try {
      const res = await evaluateWeek(period);
      verdict = res.verdict;
    } catch {
      verdict = null; // never block the page on a Leo failure
    }
  }

  return {
    period,
    label: prettyWeek(period),
    isCurrent,
    readOnly: !isCurrent,
    prevWeek: shiftWeekPeriod(period, -1),
    nextWeek: isCurrent ? null : shiftWeekPeriod(period, 1),
    days,
    monthGoals,
    stats,
    trend,
    verdict,
  };
}

// ---- Mutations ----

export async function addGoal(
  level: GoalLevel,
  content: string,
  parentId?: string | null,
  periodArg?: string
): Promise<Goal | null> {
  const text = content.trim();
  if (!text) return null;
  const userId = await getUserId();
  const supabase = createServerClient();
  const period = periodArg ?? periodFor(level);

  const { data: existing } = await supabase
    .from("goals")
    .select("rank")
    .eq("user_id", userId)
    .eq("level", level)
    .eq("period", period)
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextRank = (existing?.rank ?? -1) + 1;

  const { data } = await supabase
    .from("goals")
    .insert({ user_id: userId, level, period, content: text, rank: nextRank, parent_id: parentId ?? null })
    .select(GOAL_COLS)
    .single();

  return (data as Goal) ?? null;
}

/** Add one task (goal + optional action) to a weekday. Days hold several tasks now. */
export async function addWeekTask(
  period: string,
  dayIndex: number,
  goal: string,
  action: string
): Promise<Goal | null> {
  const content = goal.trim();
  if (!content) return null;
  const userId = await getUserId();
  const supabase = createServerClient();

  const { count } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("level", "weekly")
    .eq("period", period)
    .eq("day_index", dayIndex);
  if ((count ?? 0) >= MAX_WEEK_TASKS_PER_DAY) return null;

  const { data } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      level: "weekly",
      period,
      content,
      action: action.trim(),
      day_index: dayIndex,
      rank: count ?? 0,
    })
    .select(GOAL_COLS)
    .single();
  return (data as Goal) ?? null;
}

/** Edit one week task's text. */
export async function updateWeekTask(id: string, goal: string, action: string): Promise<void> {
  const content = goal.trim();
  if (!content) return;
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase
    .from("goals")
    .update({ content, action: action.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function setGoalParent(id: string, parentId: string | null): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase
    .from("goals")
    .update({ parent_id: parentId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function updateGoal(id: string, content: string): Promise<void> {
  const text = content.trim();
  if (!text) return;
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase
    .from("goals")
    .update({ content: text, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function toggleGoal(id: string, done: boolean): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase
    .from("goals")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function deleteGoal(id: string): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);
}

/** Persist the long-horizon vision text onto the single identity row. */
export async function saveVision(threeYear: string, oneYear: string): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const identity = await getIdentity();
  const payload = {
    vision_3_year: threeYear.trim(),
    vision_1_year: oneYear.trim(),
    updated_at: new Date().toISOString(),
  };
  if (identity) {
    await supabase.from("identity").update(payload).eq("id", identity.id);
  } else {
    await supabase.from("identity").insert({ ...payload, user_id: userId });
  }
}

/** Ask Leo for 3–5 concrete goal suggestions for a level; returns plain strings (never auto-inserted). */
export async function suggestGoalsForLevel(
  level: GoalLevel,
  period: string
): Promise<string[]> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
  const effectivePeriod = period || periodFor(level);

  let parentGoals: string[] = [];
  if (level === "monthly") {
    const { data } = await supabase
      .from("goals")
      .select("content")
      .eq("user_id", userId)
      .eq("level", "yearly")
      .eq("period", periodYear())
      .order("rank", { ascending: true });
    parentGoals = ((data ?? []) as { content: string }[]).map((g) => g.content);
  } else if (level === "weekly") {
    const { data } = await supabase
      .from("goals")
      .select("content")
      .eq("user_id", userId)
      .eq("level", "monthly")
      .eq("period", periodMonth())
      .order("rank", { ascending: true });
    parentGoals = ((data ?? []) as { content: string }[]).map((g) => g.content);
  }

  const { data: existingData } = await supabase
    .from("goals")
    .select("content")
    .eq("user_id", userId)
    .eq("level", level)
    .eq("period", effectivePeriod)
    .order("rank", { ascending: true });
  const existing = ((existingData ?? []) as { content: string }[]).map((g) => g.content);

  return suggestGoals({ identity, profile, level, parentGoals, existing });
}

/** Score a week's plan-vs-actual, get Leo's verdict, persist it, and return the result. */
export async function evaluateWeek(
  period: string
): Promise<{ verdict: string; pct: number; planned: number; done: number }> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);

  const scaffold = weekDates(period);
  const { data: rows } = await supabase
    .from("goals")
    .select("content, action, day_index, done")
    .eq("user_id", userId)
    .eq("level", "weekly")
    .eq("period", period)
    .not("day_index", "is", null)
    .order("rank", { ascending: true });

  // One entry per task (a day can hold several) — weekday repeats, Leo reads it fine.
  const weekdayOf = new Map(scaffold.map((s) => [s.dayIndex, s.weekday]));
  const days = ((rows ?? []) as { content: string; action: string | null; day_index: number; done: boolean }[])
    .map((g) => ({
      weekday: weekdayOf.get(g.day_index) ?? "?",
      goal: g.content,
      action: g.action ?? "",
      done: g.done,
    }))
    .filter((d) => d.goal.trim());

  const planned = days.length;
  const done = days.filter((d) => d.done).length;
  const pct = planned ? Math.round((done / planned) * 100) : 0;
  const gaps = days.filter((d) => !d.done).map((d) => ({ weekday: d.weekday, goal: d.goal }));

  const monthKey = scaffold[3].date.slice(0, 7);
  const { data: mGoals } = await supabase
    .from("goals")
    .select("content")
    .eq("user_id", userId)
    .eq("level", "monthly")
    .eq("period", monthKey)
    .order("rank", { ascending: true });
  const monthGoals = ((mGoals ?? []) as { content: string }[]).map((g) => g.content);

  const { data: trendRows } = await supabase
    .from("weekly_reviews")
    .select("period, completion")
    .eq("user_id", userId)
    .lt("period", period)
    .order("period", { ascending: false })
    .limit(4);
  const trend = ((trendRows ?? []) as { period: string; completion: number }[])
    .map((r) => `${r.period}: ${Math.round(Number(r.completion) * 100)}%`)
    .reverse()
    .join(", ");

  const verdict = await evaluateWeekPlan({
    identity,
    profile,
    weekLabel: prettyWeek(period),
    days,
    monthGoals,
    trend,
  });

  await supabase.from("weekly_reviews").upsert(
    {
      user_id: userId,
      period,
      completion: planned ? done / planned : 0,
      planned,
      done_count: done,
      verdict,
      stats: { gaps },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,period" }
  );

  return { verdict, pct, planned, done };
}

/** On-demand Leo read of a vision + its goals (3-year / yearly views). Not persisted. */
export async function askLeoAboutVision(level: "three_year" | "yearly"): Promise<string> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);

  const { data } = await supabase
    .from("goals")
    .select("content, done")
    .eq("user_id", userId)
    .eq("level", level)
    .eq("period", periodFor(level))
    .order("rank", { ascending: true });
  const goals = ((data ?? []) as { content: string; done: boolean }[]).map((g) => ({
    content: g.content,
    done: g.done,
  }));

  const horizon = level === "three_year" ? "3-year" : "1-year";
  const vision =
    (level === "three_year" ? identity?.vision_3_year : identity?.vision_1_year) ?? "";

  return visionFeedback({ identity, profile, horizon, vision, goals });
}

/** On-demand Leo read of a month's likelihood + push. Not persisted. */
export async function evaluateMonth(period: string): Promise<string> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);

  const { data: mGoals } = await supabase
    .from("goals")
    .select("content, done")
    .eq("user_id", userId)
    .eq("level", "monthly")
    .eq("period", period)
    .order("rank", { ascending: true });
  const goals = ((mGoals ?? []) as { content: string; done: boolean }[]).map((g) => ({
    content: g.content,
    done: g.done,
  }));

  const { data: yGoals } = await supabase
    .from("goals")
    .select("content")
    .eq("user_id", userId)
    .eq("level", "yearly")
    .eq("period", periodYear())
    .order("rank", { ascending: true });
  const yearlyGoals = ((yGoals ?? []) as { content: string }[]).map((g) => g.content);

  const total = goals.length;
  const doneCount = goals.filter((g) => g.done).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return monthOutlook({ identity, profile, monthLabel: prettyMonth(period), goals, yearlyGoals, pct });
}
