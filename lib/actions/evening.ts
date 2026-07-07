"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { getRecentPatternsSummary } from "@/lib/actions/history";
import { eveningRealization, manifestationPrompt } from "@/lib/ai/coach";
import { todayISO } from "@/lib/date";
import {
  scorecardSummary,
  scorecardAverage,
  type EveningScore,
} from "@/lib/evening-scorecard";

export type EveningInput = {
  story_moment: string;
  mistakes: string;
  better_tomorrow: string;
  scorecard: EveningScore;
  honest_readout: string;
  energy_leak: string;
  self_respect_score: number;
  win: string;
  first_move: string;
  vision_felt_vividness: number;
  vision_felt_note: string;
  gratitudes: string[];
  gratitude_felt_most: string;
};

async function getTodayCheckinsSummary(userId: string, date: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("checkins")
    .select("prompt, response, mood")
    .eq("user_id", userId)
    .eq("date", date);
  if (!data || data.length === 0) return "No mid-day check-ins recorded today.";
  return data
    .map((c) => `- "${c.prompt}" -> ${c.response ?? "no response"}${c.mood ? ` (mood: ${c.mood})` : ""}`)
    .join("\n");
}

export async function submitEveningEntry(input: EveningInput) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const [identity, profile, checkinsSummary, recentPatterns] = await Promise.all([
    getIdentity(),
    getProfile(),
    getTodayCheckinsSummary(userId, date),
    getRecentPatternsSummary(),
  ]);

  const eveningJournal = {
    story_moment: input.story_moment,
    mistakes: input.mistakes,
    better_tomorrow: input.better_tomorrow,
    scorecard: input.scorecard,
    scorecard_average: scorecardAverage(input.scorecard),
    honest_readout: input.honest_readout,
    energy_leak: input.energy_leak,
    self_respect_score: input.self_respect_score,
    win: input.win,
    first_move: input.first_move,
    vision_felt_vividness: input.vision_felt_vividness,
    vision_felt_note: input.vision_felt_note,
    gratitudes: input.gratitudes.filter((g) => g.trim()),
    gratitude_felt_most: input.gratitude_felt_most,
  };

  const [realization, manifestation] = await Promise.all([
    eveningRealization({
      identity,
      profile,
      journalEntry: eveningJournal,
      scorecardSummary: scorecardSummary(input.scorecard),
      honestReadout: input.honest_readout,
      checkinsSummary,
      recentPatterns,
    }),
    manifestationPrompt({ identity, profile, firstMove: input.first_move }),
  ]);

  await supabase.from("journal_entries").upsert(
    {
      user_id: userId,
      date,
      evening: { ...eveningJournal, manifestation },
      ai_realization: realization,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );

  // Mirror the sensory read into the shared felt-sense log so the Manifestation
  // section shows evening visualizations alongside the guided ritual. Only log when
  // the user actually wrote something — skipping the step leaves the log clean.
  if (input.vision_felt_note.trim()) {
    await supabase.from("vision_sessions").insert({
      user_id: userId,
      date,
      focus: "first_move",
      vividness: Math.min(10, Math.max(1, Math.round(input.vision_felt_vividness || 5))),
      felt_note: input.vision_felt_note.trim(),
    });
  }

  // Append-only pattern log entry so future evenings can cross-reference tonight's
  // mistake/realization instead of starting from zero each time.
  await supabase.from("patterns").insert({
    user_id: userId,
    date,
    description: `Mistake/learning: ${input.mistakes}. Better tomorrow: ${input.better_tomorrow}.`,
    category: "say-vs-do",
  });

  // Auto-mark habit logs from check-ins that were explicitly linked to a habit,
  // so the tracker reflects real-time responses instead of the night write-up alone.
  const { data: linkedCheckins } = await supabase
    .from("checkins")
    .select("habit_id, response")
    .eq("user_id", userId)
    .eq("date", date)
    .not("habit_id", "is", null);

  if (linkedCheckins) {
    for (const c of linkedCheckins) {
      if (!c.habit_id) continue;
      await supabase.from("habit_logs").upsert(
        {
          user_id: userId,
          habit_id: c.habit_id,
          date,
          completed: c.response === "done" || c.response === "partial",
          source: "checkin",
        },
        { onConflict: "habit_id,date" }
      );
    }
  }

  return { realization, manifestation };
}
