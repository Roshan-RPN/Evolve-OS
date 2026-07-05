import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GoalsBoard, type GoalsBoardData } from "./goals-board";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import {
  getVisions,
  getLevelGoals,
  getMonthlyGrid,
  getWeeklyPlan,
  type GoalsView,
} from "@/lib/actions/goals";

export const dynamic = "force-dynamic";

const VIEWS: GoalsView[] = ["three_year", "yearly", "monthly", "weekly"];

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  if (!(await hasCompletedOnboarding())) redirect("/onboarding");

  const { view: rawView, week } = await searchParams;
  const view: GoalsView = VIEWS.includes(rawView as GoalsView)
    ? (rawView as GoalsView)
    : "weekly";

  const visions = await getVisions();

  const data: GoalsBoardData = { view, visions };

  if (view === "three_year") {
    data.threeYearGoals = await getLevelGoals("three_year");
  } else if (view === "yearly") {
    data.yearlyGoals = await getLevelGoals("yearly");
  } else if (view === "monthly") {
    data.monthly = await getMonthlyGrid();
  } else {
    data.weekly = await getWeeklyPlan(week);
  }

  return (
    <AppShell>
      <GoalsBoard data={data} />
    </AppShell>
  );
}
