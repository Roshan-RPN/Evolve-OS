"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { middayNudge } from "@/lib/ai/coach";
import { todayISO } from "@/lib/date";

export type PriorityStatus = "done" | "moving" | "stalled" | "untouched";

export type AfternoonInput = {
  on_track_score: number;
  energy: string;
  priority_progress: { priority: string; status: PriorityStatus }[];
  drift: string;
  honest_line: string;
  refocus: string;
};

// Context the wizard opens with: today's locked priorities to check off, and
// whether an afternoon reset was already saved today (so we can show it done).
export async function getAfternoonContext() {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const [{ data: plan }, { data: journal }] = await Promise.all([
    supabase.from("plans").select("top_priorities, locked").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("journal_entries").select("afternoon").eq("user_id", userId).eq("date", date).maybeSingle(),
  ]);
  const priorities = Array.isArray(plan?.top_priorities) ? (plan!.top_priorities as string[]) : [];
  return {
    priorities,
    planLocked: Boolean(plan?.locked),
    alreadyDone: Boolean(journal?.afternoon),
  };
}

async function getTodayCheckinsSummary(userId: string, date: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("checkins")
    .select("prompt, response, mood")
    .eq("user_id", userId)
    .eq("date", date);
  if (!data || data.length === 0) return "No mid-day check-ins recorded yet.";
  return data
    .map((c) => `- "${c.prompt}" -> ${c.response ?? "no response"}${c.mood ? ` (mood: ${c.mood})` : ""}`)
    .join("\n");
}

export async function submitAfternoonEntry(input: AfternoonInput) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const date = todayISO();
  const [identity, profile, checkinsSummary] = await Promise.all([
    getIdentity(),
    getProfile(),
    getTodayCheckinsSummary(userId, date),
  ]);

  const priorityProgress = input.priority_progress.length
    ? input.priority_progress.map((p) => `- ${p.priority}: ${p.status}`).join("\n")
    : "";

  const nudge = await middayNudge({
    identity,
    profile,
    onTrackScore: input.on_track_score,
    energy: input.energy,
    priorityProgress,
    drift: input.drift,
    honestLine: input.honest_line,
    refocus: input.refocus,
    checkinsSummary,
  });

  const afternoonJournal = {
    on_track_score: input.on_track_score,
    energy: input.energy,
    priority_progress: input.priority_progress,
    drift: input.drift,
    honest_line: input.honest_line,
    refocus: input.refocus,
    nudge,
  };

  // Only afternoon + updated_at are written, so morning/evening on the same row
  // are left untouched (Postgres ON CONFLICT sets only the columns we pass).
  await supabase.from("journal_entries").upsert(
    {
      user_id: userId,
      date,
      afternoon: afternoonJournal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" }
  );

  return { nudge };
}
