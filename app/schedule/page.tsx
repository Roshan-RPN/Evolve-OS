import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ScheduleBoard } from "./schedule-board";
import { getScheduleForDate } from "@/lib/actions/schedule";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { todayISO, relativeDayLabel } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!(await hasCompletedOnboarding())) redirect("/onboarding");

  const { date: requested } = await searchParams;
  const today = todayISO();
  // Only allow viewing today or the past — never a future day.
  const date = requested && requested <= today ? requested : today;
  const isToday = date === today;

  const { items } = await getScheduleForDate(date);

  return (
    <AppShell>
      <ScheduleBoard
        key={date}
        initial={items}
        date={date}
        today={today}
        dateLabel={relativeDayLabel(date, today)}
        readOnly={!isToday}
      />
    </AppShell>
  );
}
