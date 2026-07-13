import { redirect } from "next/navigation";
import { getHabitDashboard } from "@/lib/actions/habits";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { AppShell } from "@/components/app-shell";
import { HabitTracker } from "./habit-tracker";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const [onboarded, { habits, backlog, completedToday, minutesToday, heatmap }] = await Promise.all([
    hasCompletedOnboarding(),
    getHabitDashboard(),
  ]);
  if (!onboarded) redirect("/onboarding");

  return (
    <AppShell>
      <HabitTracker
        habits={habits}
        backlog={backlog}
        completedTodayIds={Array.from(completedToday)}
        minutesToday={minutesToday}
        heatmap={heatmap}
      />
    </AppShell>
  );
}
