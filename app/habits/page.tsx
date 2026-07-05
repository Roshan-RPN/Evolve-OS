import { redirect } from "next/navigation";
import { getHabitDashboard } from "@/lib/actions/habits";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { AppShell } from "@/components/app-shell";
import { HabitTracker } from "./habit-tracker";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  if (!(await hasCompletedOnboarding())) redirect("/onboarding");
  const { habits, backlog, completedToday, minutesToday, heatmap } = await getHabitDashboard();

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
