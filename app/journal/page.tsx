import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Reveal } from "@/components/motion/reveal";
import { JournalHistory } from "@/components/journal-history";
import { getJournalHistory } from "@/lib/actions/journal-history";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function JournalHistoryPage() {
  if (!(await hasCompletedOnboarding())) redirect("/onboarding");
  const days = await getJournalHistory();
  const today = todayISO();

  return (
    <AppShell>
      <Reveal className="space-y-4" stagger={0.06}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center corner-cut grad-dusk text-white shadow-md lg:size-11">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-semibold lg:text-2xl">Journal history</h1>
            <p className="text-xs text-muted-foreground lg:text-sm">
              Every morning, afternoon, and evening you&apos;ve written — tap a day to read it back.
            </p>
          </div>
        </div>

        <JournalHistory days={days} today={today} />
      </Reveal>
    </AppShell>
  );
}
