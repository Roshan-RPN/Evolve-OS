"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import {
  todayISO,
  periodWeek,
  periodMonth,
  shiftWeekPeriod,
  shiftMonthPeriod,
  prettyWeek,
  prettyMonth,
  weekDates,
  monthDates,
  weekKeyOf,
} from "@/lib/date";

export type AnalyticsMode = "week" | "month";

export type DayPoint = {
  date: string;
  label: string;
  energy: number | null;
  selfRespect: number | null;
  habitsDone: number;
};

export type HabitInsight = {
  id: string;
  name: string;
  icon: string | null; // key from lib/habit-icons.ts, null pre-migration-0007
  color: string | null; // palette key from lib/habit-colors.ts, null pre-migration-0011
  type: "identity" | "stretch" | "backlog";
  days: boolean[]; // window length, oldest -> newest
  doneCount: number;
  rate: number; // 0..100 over the window
  streak: number;
  best: number;
  minutes: number; // total logged minutes in window
  trend: "up" | "down" | "flat";
};

export type DowPoint = { label: string; rate: number; avgDone: number };
export type Correlation = { label: string; detail: string; delta: number };

/** One planned day of the weekly plan, joined against reality. */
export type PlanDay = {
  weekday: string;
  date: string;
  goal: string;
  action: string | null;
  done: boolean;
};

export type WeekPlanInsight = {
  period: string;
  label: string;
  planned: number;
  done: number;
  pct: number;
  wins: PlanDay[];
  losses: PlanDay[]; // past days, planned but not done
  upcoming: PlanDay[]; // today/future, still open
};

export type MonthPlanInsight = {
  period: string;
  label: string;
  total: number;
  done: number;
  pct: number;
  doneList: string[];
  openList: string[];
  daysLeft: number;
  weeklyTrend: { period: string; label: string; pct: number }[];
};

export type AnalyticsData = {
  mode: AnalyticsMode;
  days: DayPoint[];
  /** Full calendar period incl. future days (empty) — for month-length axes/calendars. */
  fullDays: DayPoint[];
  today: string; // actual today (ISO) so clients can ghost future cells
  windowDays: number;
  rangeFrom: string; // ISO date, window start
  rangeTo: string; // ISO date, window end (today for the current period)
  periodLabel: string; // 'Jun 29 – Jul 5' or 'July 2026'
  offset: number; // 0 = current week/month, 1 = the one before…
  habitCompletionRate: number; // 0..100 over the window
  checkinHonestyRate: number; // 0..100 (done+partial / responded)
  avgSelfRespect: number | null;
  avgEnergy: number | null;
  favoriteHabits: { name: string; count: number }[];
  streaks: { name: string; streak: number; best: number }[];
  totalHabitCompletions: number;
  journaledDays: number;
  perHabit: HabitInsight[];
  timeByHabit: { name: string; minutes: number }[];
  totalMinutes: number;
  hasTimeData: boolean;
  dow: DowPoint[];
  bestDow: string | null;
  worstDow: string | null;
  correlations: Correlation[];
  slipping: HabitInsight[];
  // plan vs reality
  weekPlan: WeekPlanInsight | null; // week mode only
  monthPlan: MonthPlanInsight | null; // month mode only
  // deep stats
  perfectDays: number; // every active habit done
  zeroDays: number; // nothing done
  bestChain: number; // longest run of days with ≥1 habit
  avgPerDay: number;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function avg(arr: number[]): number | null {
  return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
}

export async function getAnalytics(offset = 0, mode: AnalyticsMode = "week"): Promise<AnalyticsData> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const off = Math.max(0, offset);
  const today = todayISO();

  // Window = a real calendar period (ISO week Mon–Sun, or calendar month),
  // truncated at today for the current period so future days don't dilute rates.
  let period: string;
  let periodLabel: string;
  let allDates: string[];
  if (mode === "month") {
    period = shiftMonthPeriod(periodMonth(), -off);
    periodLabel = prettyMonth(period);
    allDates = monthDates(period);
  } else {
    period = shiftWeekPeriod(periodWeek(), -off);
    periodLabel = prettyWeek(period);
    allDates = weekDates(period).map((d) => d.date);
  }
  const windowDates = allDates.filter((d) => d <= today);
  const N = Math.max(1, windowDates.length);
  const from = windowDates[0] ?? today;
  const to = windowDates[windowDates.length - 1] ?? today;
  const idxOf = new Map(windowDates.map((d, i) => [d, i]));

  // Pull logs with minutes when available; fall back if the column is missing.
  let logs: { habit_id: string; date: string; completed: boolean; minutes?: number | null }[] = [];
  let hasTimeData = false;
  const logsWithMin = await supabase
    .from("habit_logs")
    .select("habit_id, date, completed, minutes")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);
  if (logsWithMin.error) {
    const { data } = await supabase
      .from("habit_logs")
      .select("habit_id, date, completed")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", to);
    logs = (data || []) as typeof logs;
  } else {
    logs = (logsWithMin.data || []) as typeof logs;
    hasTimeData = logs.some((l) => typeof l.minutes === "number" && l.minutes > 0);
  }

  const [{ data: journals }, { data: checkins }] = await Promise.all([
    supabase.from("journal_entries").select("date, morning, evening").eq("user_id", userId).gte("date", from).lte("date", to),
    supabase.from("checkins").select("response").eq("user_id", userId).gte("date", from).lte("date", to),
  ]);

  // Habits — include icon when the column exists (post-0007); fall back without it.
  type HabitRow = {
    id: string; name: string; type: string; streak: number; best_streak: number; status: string;
    icon?: string | null;
  };
  let habits: HabitRow[] = [];
  const habitsQ = await supabase
    .from("habits")
    .select("id, name, type, streak, best_streak, status, icon")
    .eq("user_id", userId);
  if (habitsQ.error) {
    const { data } = await supabase
      .from("habits")
      .select("id, name, type, streak, best_streak, status")
      .eq("user_id", userId);
    habits = (data ?? []) as HabitRow[];
  } else {
    habits = (habitsQ.data ?? []) as HabitRow[];
  }

  const habitName = new Map<string, string>();
  habits.forEach((h) => habitName.set(h.id, h.name));

  // Habit colours (migration 0011) — best-effort, separate query so a missing
  // column never breaks the main habits/icons fetch.
  const colorById = new Map<string, string>();
  const colorsQ = await supabase.from("habits").select("id, color").eq("user_id", userId);
  if (!colorsQ.error) {
    for (const r of (colorsQ.data ?? []) as { id: string; color: string | null }[]) {
      if (r.color) colorById.set(r.id, r.color);
    }
  }

  // Day series, oldest -> newest
  const days: DayPoint[] = windowDates.map((iso) => {
    const j = (journals ?? []).find((x) => x.date === iso);
    const morning = (j?.morning ?? null) as { energy?: number } | null;
    const evening = (j?.evening ?? null) as { self_respect_score?: number } | null;
    const habitsDone = logs.filter((l) => l.date === iso && l.completed).length;
    return {
      date: iso,
      label: dayLabel(iso),
      energy: typeof morning?.energy === "number" ? morning.energy : null,
      selfRespect: typeof evening?.self_respect_score === "number" ? evening.self_respect_score : null,
      habitsDone,
    };
  });

  // Full calendar period — past days reuse the built points, future days are empty.
  const fullDays: DayPoint[] = allDates.map((iso) => {
    const i = idxOf.get(iso);
    if (i !== undefined) return days[i];
    return { date: iso, label: dayLabel(iso), energy: null, selfRespect: null, habitsDone: 0 };
  });

  // ---- per-habit insights ----------------------------------------------------
  const activeHabits = (habits ?? []).filter((h) => h.status !== "archived");
  const perHabit: HabitInsight[] = activeHabits.map((h) => {
    const strip = new Array<boolean>(N).fill(false);
    let minutes = 0;
    for (const l of logs) {
      if (l.habit_id !== h.id) continue;
      const i = idxOf.get(l.date);
      if (i === undefined) continue;
      if (l.completed) strip[i] = true;
      if (typeof l.minutes === "number") minutes += l.minutes;
    }
    const doneCount = strip.filter(Boolean).length;
    const half = Math.floor(N / 2);
    const firstHalf = strip.slice(0, half).filter(Boolean).length;
    const secondHalf = strip.slice(half).filter(Boolean).length;
    // Normalize halves so an odd split doesn't fake a trend.
    const f = half ? firstHalf / half : 0;
    const s = N - half ? secondHalf / (N - half) : 0;
    const diff = s - f;
    const trend: HabitInsight["trend"] = diff > 0.15 ? "up" : diff < -0.15 ? "down" : "flat";
    return {
      id: h.id as string,
      name: h.name as string,
      icon: h.icon ?? null,
      color: colorById.get(h.id) ?? null,
      type: (h.type as HabitInsight["type"]) ?? "identity",
      days: strip,
      doneCount,
      rate: Math.round((doneCount / N) * 100),
      streak: (h.streak as number) ?? 0,
      best: (h.best_streak as number) ?? 0,
      minutes,
      trend,
    };
  });

  // Slipping: was reasonably active but genuinely fell off — a habit still at 70%+
  // isn't slipping just because one recent day was missed.
  const minActive = mode === "month" ? 5 : 2;
  const slipping = perHabit
    .filter(
      (h) =>
        h.doneCount >= minActive &&
        h.rate < 70 &&
        (h.trend === "down" || (h.streak === 0 && h.days[N - 1] === false))
    )
    .sort((a, b) => b.doneCount - a.doneCount);

  // Time per habit
  const timeByHabit = perHabit
    .filter((h) => h.minutes > 0)
    .map((h) => ({ name: h.name, minutes: h.minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  const totalMinutes = timeByHabit.reduce((s, h) => s + h.minutes, 0);

  // ---- day-of-week pattern ---------------------------------------------------
  const maxHabits = Math.max(1, activeHabits.length);
  const dowAgg = DOW_LABELS.map(() => ({ sum: 0, n: 0 }));
  for (const d of days) {
    const wd = new Date(d.date + "T00:00:00").getDay();
    dowAgg[wd].sum += d.habitsDone;
    dowAgg[wd].n += 1;
  }
  const dow: DowPoint[] = DOW_LABELS.map((label, i) => {
    const a = dowAgg[i];
    const avgDone = a.n ? a.sum / a.n : 0;
    return { label, avgDone: Math.round(avgDone * 10) / 10, rate: Math.round((avgDone / maxHabits) * 100) };
  });
  const withData = dow.filter((_, i) => dowAgg[i].n > 0);
  const bestDow = withData.length ? [...withData].sort((a, b) => b.rate - a.rate)[0].label : null;
  const worstDow = withData.length ? [...withData].sort((a, b) => a.rate - b.rate)[0].label : null;

  // ---- correlations: mood/energy on high- vs low-habit days ------------------
  const doneVals = days.map((d) => d.habitsDone).sort((a, b) => a - b);
  const median = doneVals.length ? doneVals[Math.floor(doneVals.length / 2)] : 0;
  const correlations: Correlation[] = [];
  const buildCorr = (key: "selfRespect" | "energy", label: string): Correlation | null => {
    const high = days.filter((d) => d.habitsDone >= median && d[key] != null).map((d) => d[key] as number);
    const low = days.filter((d) => d.habitsDone < median && d[key] != null).map((d) => d[key] as number);
    if (high.length < 2 || low.length < 2) return null;
    const hi = avg(high)!;
    const lo = avg(low)!;
    const delta = Math.round((hi - lo) * 10) / 10;
    if (Math.abs(delta) < 0.3) return null;
    return {
      label,
      detail: `${label} runs ${hi}/10 on high-habit days vs ${lo}/10 on low ones.`,
      delta,
    };
  };
  const c1 = buildCorr("selfRespect", "Self-respect");
  const c2 = buildCorr("energy", "Energy");
  if (c1) correlations.push(c1);
  if (c2) correlations.push(c2);

  // ---- plan vs reality -------------------------------------------------------
  let weekPlan: WeekPlanInsight | null = null;
  if (mode === "week") {
    const scaffold = weekDates(period);
    const { data: rows } = await supabase
      .from("goals")
      .select("content, action, day_index, done")
      .eq("user_id", userId)
      .eq("level", "weekly")
      .eq("period", period)
      .not("day_index", "is", null)
      .order("rank", { ascending: true });
    // Days hold several tasks now — list every one, not just the last per day.
    const dayOf = new Map(scaffold.map((s) => [s.dayIndex, s]));
    const items: PlanDay[] = ((rows ?? []) as { content: string; action: string | null; day_index: number; done: boolean }[])
      .flatMap((g) => {
        const s = dayOf.get(g.day_index);
        if (!s || !g.content.trim()) return [];
        return [{ weekday: s.weekday, date: s.date, goal: g.content, action: g.action, done: g.done }];
      });
    const wins = items.filter((i) => i.done);
    const losses = items.filter((i) => !i.done && i.date < today);
    const upcoming = items.filter((i) => !i.done && i.date >= today);
    weekPlan = {
      period,
      label: periodLabel,
      planned: items.length,
      done: wins.length,
      pct: items.length ? Math.round((wins.length / items.length) * 100) : 0,
      wins,
      losses,
      upcoming,
    };
  }

  let monthPlan: MonthPlanInsight | null = null;
  if (mode === "month") {
    const [{ data: mGoals }, { data: reviews }] = await Promise.all([
      supabase
        .from("goals")
        .select("content, done")
        .eq("user_id", userId)
        .eq("level", "monthly")
        .eq("period", period)
        .order("rank", { ascending: true }),
      supabase
        .from("weekly_reviews")
        .select("period, completion")
        .eq("user_id", userId)
        .gte("period", weekKeyOf(from))
        .lte("period", weekKeyOf(to))
        .order("period", { ascending: true }),
    ]);
    const goals = ((mGoals ?? []) as { content: string; done: boolean }[]);
    const doneList = goals.filter((g) => g.done).map((g) => g.content);
    const openList = goals.filter((g) => !g.done).map((g) => g.content);
    const weeklyTrend = ((reviews ?? []) as { period: string; completion: number }[]).map((r) => ({
      period: r.period,
      label: prettyWeek(r.period),
      pct: Math.round(Number(r.completion) * 100),
    }));
    monthPlan = {
      period,
      label: periodLabel,
      total: goals.length,
      done: doneList.length,
      pct: goals.length ? Math.round((doneList.length / goals.length) * 100) : 0,
      doneList,
      openList,
      daysLeft: allDates.filter((d) => d > today).length,
      weeklyTrend,
    };
  }

  // ---- deep stats --------------------------------------------------------------
  const perfectDays = activeHabits.length
    ? days.filter((d) => d.habitsDone >= activeHabits.length).length
    : 0;
  const zeroDays = days.filter((d) => d.habitsDone === 0).length;
  let bestChain = 0;
  let chain = 0;
  for (const d of days) {
    chain = d.habitsDone > 0 ? chain + 1 : 0;
    if (chain > bestChain) bestChain = chain;
  }

  // ---- legacy aggregates (home + backward compat) ---------------------------
  const counts = new Map<string, number>();
  logs.forEach((l) => {
    if (!l.completed) return;
    counts.set(l.habit_id, (counts.get(l.habit_id) ?? 0) + 1);
  });
  const favoriteHabits = [...counts.entries()]
    .map(([id, count]) => ({ name: habitName.get(id) ?? "Habit", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const totalHabitCompletions = logs.filter((l) => l.completed).length;
  const totalLogs = logs.length;
  const habitCompletionRate = totalLogs ? Math.round((totalHabitCompletions / totalLogs) * 100) : 0;

  const responded = (checkins ?? []).filter((c) => c.response);
  const kept = responded.filter((c) => c.response === "done" || c.response === "partial").length;
  const checkinHonestyRate = responded.length ? Math.round((kept / responded.length) * 100) : 0;

  const srScores = days.map((d) => d.selfRespect).filter((n): n is number => n != null);
  const enScores = days.map((d) => d.energy).filter((n): n is number => n != null);

  const streaks = activeHabits
    .map((h) => ({ name: h.name as string, streak: (h.streak as number) ?? 0, best: (h.best_streak as number) ?? 0 }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 6);

  return {
    mode,
    days,
    fullDays,
    today,
    windowDays: N,
    rangeFrom: from,
    rangeTo: to,
    periodLabel,
    offset: off,
    habitCompletionRate,
    checkinHonestyRate,
    avgSelfRespect: avg(srScores),
    avgEnergy: avg(enScores),
    favoriteHabits,
    streaks,
    totalHabitCompletions,
    journaledDays: (journals ?? []).length,
    perHabit,
    timeByHabit,
    totalMinutes,
    hasTimeData,
    dow,
    bestDow,
    worstDow,
    correlations,
    slipping,
    weekPlan,
    monthPlan,
    perfectDays,
    zeroDays,
    bestChain,
    avgPerDay: Math.round((totalHabitCompletions / N) * 10) / 10,
  };
}
