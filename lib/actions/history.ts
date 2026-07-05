"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { daysAgoISO, todayISO } from "@/lib/date";

export async function getRecentCompletionSummary(): Promise<string> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const since = daysAgoISO(14);
  const today = todayISO();

  const [{ data: logs }, { data: checkins }] = await Promise.all([
    supabase.from("habit_logs").select("completed").eq("user_id", userId).gte("date", since).lte("date", today),
    supabase.from("checkins").select("response").eq("user_id", userId).gte("date", since).lte("date", today),
  ]);

  const totalLogs = logs?.length ?? 0;
  const completedLogs = logs?.filter((l) => l.completed).length ?? 0;
  const habitRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : null;

  const totalCheckins = checkins?.length ?? 0;
  const doneCheckins = checkins?.filter((c) => c.response === "done").length ?? 0;
  const partialCheckins = checkins?.filter((c) => c.response === "partial").length ?? 0;
  const skippedCheckins = checkins?.filter((c) => c.response === "skipped").length ?? 0;

  const parts: string[] = [];
  parts.push(
    habitRate !== null
      ? `Habit completion over the last 14 days: ${habitRate}% (${completedLogs}/${totalLogs} logged).`
      : "No habit history yet."
  );
  parts.push(
    totalCheckins > 0
      ? `Mid-day check-ins last 14 days: ${doneCheckins} done, ${partialCheckins} partial, ${skippedCheckins} skipped out of ${totalCheckins}.`
      : "No mid-day check-in history yet."
  );
  return parts.join(" ");
}

export async function getRecentPatternsSummary(): Promise<string> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const since = daysAgoISO(14);
  const { data } = await supabase
    .from("patterns")
    .select("date, description, category")
    .eq("user_id", userId)
    .gte("date", since)
    .order("date", { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return "No patterns logged yet.";
  return data.map((p) => `[${p.date}] ${p.category ? `(${p.category}) ` : ""}${p.description}`).join("\n");
}
