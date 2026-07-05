"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { getRecentCompletionSummary } from "@/lib/actions/history";
import { critiquePlan, morningStory } from "@/lib/ai/coach";
import { todayISO } from "@/lib/date";

export type MorningInput = {
  affirmations: string;
  affirmation_truth_score: number;
  emotion: string;
  energy: number;
  top_priorities: string[];
  gratitudes: string[];
  gratitude_felt_most: string;
  todo: string[];
  schedule: { time: string; block: string; priority?: number }[];
};

export async function getTodayStatus() {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const [{ data: plan }, { data: journal }] = await Promise.all([
    supabase.from("plans").select("*").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("journal_entries").select("*").eq("user_id", userId).eq("date", date).maybeSingle(),
  ]);
  return { plan, journal, date };
}

export async function critiqueDraftPlan(input: {
  top_priorities: string[];
  todo: string[];
  schedule: { time: string; block: string; priority?: number }[];
}) {
  const [identity, profile, recentCompletionRate] = await Promise.all([
    getIdentity(),
    getProfile(),
    getRecentCompletionSummary(),
  ]);
  return critiquePlan({ identity, profile, plan: input, recentCompletionRate });
}

export async function submitMorningEntry(input: MorningInput) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);

  const critique = await critiquePlan({
    identity,
    profile,
    plan: {
      top_priorities: input.top_priorities,
      todo: input.todo,
      schedule: input.schedule,
    },
    recentCompletionRate: await getRecentCompletionSummary(),
  });

  // Don't clobber a schedule already built on the Schedule page: the wizard and
  // /schedule share plans.schedule, so if the wizard's schedule step is empty
  // keep whatever's already saved for today instead of wiping it to [].
  let schedule = input.schedule;
  if (!schedule?.length) {
    const { data: existing } = await supabase
      .from("plans")
      .select("schedule")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (Array.isArray(existing?.schedule) && existing!.schedule.length) {
      schedule = existing!.schedule as MorningInput["schedule"];
    }
  }

  await supabase.from("plans").upsert(
    {
      user_id: userId,
      date,
      top_priorities: input.top_priorities,
      todo: input.todo,
      schedule,
      ai_critique: critique,
      locked: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );

  const story = await morningStory({
    identity,
    profile,
    mood: input.emotion,
    energy: String(input.energy),
  });

  await supabase.from("journal_entries").upsert(
    {
      user_id: userId,
      date,
      morning: {
        affirmations: input.affirmations,
        affirmation_truth_score: input.affirmation_truth_score,
        emotion: input.emotion,
        energy: input.energy,
        gratitudes: input.gratitudes,
        gratitude_felt_most: input.gratitude_felt_most,
      },
      ai_morning_story: story,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );

  return { critique, story };
}
