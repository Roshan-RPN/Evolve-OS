"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { moodBoostStory } from "@/lib/ai/coach";
import { todayISO } from "@/lib/date";
import { revalidatePath } from "next/cache";

export async function getCheckin(id: string) {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getTodayCheckins() {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("date", todayISO())
    .order("scheduled_at", { ascending: true });
  return data || [];
}

export async function respondToCheckin({
  id,
  response,
  mood,
}: {
  id: string;
  response: "done" | "partial" | "skipped";
  mood?: "good" | "low" | "stuck" | "confused";
}) {
  const userId = await getUserId();
  const supabase = createServerClient();

  let followUpStory: string | null = null;
  if (mood && mood !== "good") {
    const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
    followUpStory = await moodBoostStory({ identity, profile, mood });
  }

  await supabase
    .from("checkins")
    .update({
      response,
      mood: mood || null,
      follow_up_story: followUpStory,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);

  revalidatePath(`/checkin/${id}`);
  return { followUpStory };
}

// Creates a check-in for each of today's locked-in top priorities that don't
// already have one, optionally linked to a habit by matching its name.
// The cron route (no session cookie) passes the profile id explicitly.
export async function createCheckinsFromTodayPlan(forUserId?: string) {
  const userId = forUserId ?? (await getUserId());
  const supabase = createServerClient();
  const date = todayISO();

  const { data: plan } = await supabase
    .from("plans")
    .select("top_priorities")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (!plan?.top_priorities?.length) return { created: 0 };

  const { data: existing } = await supabase
    .from("checkins")
    .select("prompt")
    .eq("user_id", userId)
    .eq("date", date);
  const existingPrompts = new Set((existing || []).map((c) => c.prompt));

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", userId)
    .in("status", ["active"]);

  let created = 0;
  for (const priority of plan.top_priorities as string[]) {
    const prompt = `Did you do: "${priority}"?`;
    if (existingPrompts.has(prompt)) continue;
    const matchedHabit = habits?.find((h) => priority.toLowerCase().includes(h.name.toLowerCase()));
    await supabase.from("checkins").insert({
      user_id: userId,
      date,
      prompt,
      linked_priority: priority,
      habit_id: matchedHabit?.id ?? null,
    });
    created++;
  }
  return { created };
}
