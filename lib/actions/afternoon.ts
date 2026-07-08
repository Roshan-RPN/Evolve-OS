"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { middayNudge } from "@/lib/ai/coach";
import { todayISO } from "@/lib/date";
import { revalidatePath } from "next/cache";

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
  const [{ data: plan }, { data: journal }, { data: checkins }] = await Promise.all([
    supabase.from("plans").select("top_priorities, schedule, locked").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("journal_entries").select("afternoon").eq("user_id", userId).eq("date", date).maybeSingle(),
    supabase.from("checkins").select("linked_priority, response").eq("user_id", userId).eq("date", date),
  ]);
  const topPriorities = Array.isArray(plan?.top_priorities) ? (plan!.top_priorities as string[]) : [];
  const scheduleItems = Array.isArray(plan?.schedule)
    ? (plan!.schedule as { block?: string; done?: boolean }[])
    : [];
  const scheduleBlocks = scheduleItems.map((s) => (s?.block ?? "").trim()).filter(Boolean);
  // Everything planned for today: top priorities first, then every schedule
  // block not already covered by a priority (case-insensitive dedup).
  const seen = new Set<string>();
  const priorities: string[] = [];
  for (const item of [...topPriorities, ...scheduleBlocks]) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    priorities.push(item);
  }
  // Anything already marked done elsewhere (a struck schedule block or a "done"
  // check-in) so the wizard opens with it pre-checked. Lowercased for matching.
  const doneItems = new Set<string>();
  for (const s of scheduleItems) {
    if (s.done && s.block?.trim()) doneItems.add(s.block.trim().toLowerCase());
  }
  for (const c of checkins ?? []) {
    if (c.response === "done" && c.linked_priority) doneItems.add(c.linked_priority.trim().toLowerCase());
  }
  return {
    priorities,
    doneItems: [...doneItems],
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

  // Leo (Gemini) can fail — never let that lose the reset. Fall back and still save.
  let nudge: string;
  try {
    nudge = await middayNudge({
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
  } catch (e) {
    console.error("afternoon AI failed, saving entry anyway:", e);
    nudge =
      "Leo couldn't reach through just now — but your reset is saved. You know where the day drifted; name the one thing that matters for the rest of it and go do it.";
  }

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

  // Strike off the schedule: any planned block marked "done" here.
  const doneTexts = new Set(
    input.priority_progress
      .filter((p) => p.status === "done")
      .map((p) => p.priority.trim().toLowerCase())
  );
  if (doneTexts.size) {
    const { data: plan } = await supabase
      .from("plans")
      .select("schedule")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    const items = Array.isArray(plan?.schedule)
      ? (plan!.schedule as { block?: string; done?: boolean }[])
      : [];
    let changed = false;
    const next = items.map((it) => {
      if (it.block && doneTexts.has(it.block.trim().toLowerCase())) {
        changed = true;
        return { ...it, done: true };
      }
      return it;
    });
    if (changed) {
      await supabase
        .from("plans")
        .update({ schedule: next, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("date", date);
      revalidatePath("/schedule");
    }
  }

  return { nudge };
}
