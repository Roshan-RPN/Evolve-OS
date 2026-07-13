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
  const onboardedPromise = hasCompletedOnboarding();

  const { view: rawView, week } = await searchParams;
  const view: GoalsView = VIEWS.includes(rawView as GoalsView)
    ? (rawView as GoalsView)
    : "weekly";

  const data: GoalsBoardData = { view, visions: { three_year: "", one_year: "" } };
  let onboarded: boolean;

  if (view === "three_year") {
    const [ok, visions, threeYearGoals] = await Promise.all([onboardedPromise, getVisions(), getLevelGoals("three_year")]);
    onboarded = ok; data.visions = visions; data.threeYearGoals = threeYearGoals;
  } else if (view === "yearly") {
    const [ok, visions, yearlyGoals] = await Promise.all([onboardedPromise, getVisions(), getLevelGoals("yearly")]);
    onboarded = ok; data.visions = visions; data.yearlyGoals = yearlyGoals;
  } else if (view === "monthly") {
    const [ok, visions, monthly] = await Promise.all([onboardedPromise, getVisions(), getMonthlyGrid()]);
    onboarded = ok; data.visions = visions; data.monthly = monthly;
  } else {
    const [ok, visions, weekly] = await Promise.all([onboardedPromise, getVisions(), getWeeklyPlan(week)]);
    onboarded = ok; data.visions = visions; data.weekly = weekly;
  }
  if (!onboarded) redirect("/onboarding");

  return (
    <AppShell>
      <GoalsBoard data={data} />
    </AppShell>
  );
}
