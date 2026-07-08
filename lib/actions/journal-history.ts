"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";

// Loose shapes — the JSON columns are written by the wizards; we render whatever
// is present and skip anything empty, so history stays resilient to schema drift.
export type MorningJournal = {
  affirmations?: string;
  affirmation_truth_score?: number;
  emotion?: string;
  energy?: number;
  gratitudes?: string[];
  gratitude_felt_most?: string;
};

export type AfternoonJournal = {
  on_track_score?: number;
  energy?: string;
  priority_progress?: { priority: string; status: string }[];
  drift?: string;
  honest_line?: string;
  refocus?: string;
  nudge?: string;
};

export type EveningJournal = {
  story_moment?: string;
  mistakes?: string;
  better_tomorrow?: string;
  scorecard?: Record<string, number>;
  scorecard_average?: number;
  honest_readout?: string;
  energy_leak?: string;
  self_respect_score?: number;
  win?: string;
  first_move?: string;
  vision_felt_vividness?: number;
  vision_felt_note?: string;
  gratitudes?: string[];
  gratitude_felt_most?: string;
  manifestation?: string;
};

export type DayPlan = {
  top_priorities?: string[];
  todo?: string[];
  schedule?: { time?: string; block?: string }[];
  ai_critique?: string | null;
};

export type JournalDay = {
  date: string;
  morning: MorningJournal | null;
  afternoon: AfternoonJournal | null;
  evening: EveningJournal | null;
  ai_morning_story: string | null;
  ai_realization: string | null;
  plan: DayPlan | null;
};

/**
 * Every day the user has journaled or planned, newest first. Merges the
 * journal_entries row (morning/afternoon/evening reflections + Leo's reads) with
 * that day's plans row (priorities, to-dos, schedule, Leo's plan critique) so a
 * day's full morning shows in one place. Read-only — nothing is written.
 */
export async function getJournalHistory(limit = 90): Promise<JournalDay[]> {
  const userId = await getUserId();
  const supabase = createServerClient();

  const [{ data: entries }, { data: plans }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("date, morning, afternoon, evening, ai_morning_story, ai_realization")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit),
    supabase
      .from("plans")
      .select("date, top_priorities, todo, schedule, ai_critique")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit),
  ]);

  const planByDate = new Map<string, DayPlan>();
  for (const p of plans ?? []) {
    planByDate.set(p.date as string, {
      top_priorities: (p.top_priorities as string[]) ?? [],
      todo: (p.todo as string[]) ?? [],
      schedule: (p.schedule as DayPlan["schedule"]) ?? [],
      ai_critique: (p.ai_critique as string | null) ?? null,
    });
  }

  const byDate = new Map<string, JournalDay>();
  for (const e of entries ?? []) {
    const date = e.date as string;
    byDate.set(date, {
      date,
      morning: (e.morning as MorningJournal) ?? null,
      afternoon: (e.afternoon as AfternoonJournal) ?? null,
      evening: (e.evening as EveningJournal) ?? null,
      ai_morning_story: (e.ai_morning_story as string | null) ?? null,
      ai_realization: (e.ai_realization as string | null) ?? null,
      plan: planByDate.get(date) ?? null,
    });
  }
  // Days with a plan but no journal row yet still count as a morning entry.
  for (const [date, plan] of planByDate) {
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        morning: null,
        afternoon: null,
        evening: null,
        ai_morning_story: null,
        ai_realization: null,
        plan,
      });
    }
  }

  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}
