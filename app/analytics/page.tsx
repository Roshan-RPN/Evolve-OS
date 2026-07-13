import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Flame,
  TrendingUp,
  ShieldCheck,
  PenLine,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trophy,
  CircleSlash,
  Link2,
  Gauge,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  RingStat,
  TrendChart,
  HabitBars,
  HabitHeatmap,
  PerHabitTable,
  TimeByHabit,
  DayOfWeekPattern,
  WeekByWeek,
  Correlations,
  SlippingHabits,
  WrittenReport,
  WeekPlanReport,
  MonthPlanReport,
} from "@/components/charts";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { getAnalytics, type AnalyticsMode } from "@/lib/actions/analytics";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; view?: string }>;
}) {
  const onboardedPromise = hasCompletedOnboarding();
  const { w, view } = await searchParams;
  const mode: AnalyticsMode = view === "month" ? "month" : "week";
  const offset = Math.max(0, Number.parseInt(w ?? "0", 10) || 0);
  const [onboarded, a] = await Promise.all([onboardedPromise, getAnalytics(offset, mode)]);
  if (!onboarded) redirect("/onboarding");
  const focusHours = Math.round((a.totalMinutes / 60) * 10) / 10;
  // backlog habits are parked — they can't be ticked, so they don't count toward "all done"
  const tickableHabits = a.perHabit.filter((h) => h.type !== "backlog").length;
  const pageHref = (o: number, m: AnalyticsMode) =>
    `/analytics?view=${m}${o > 0 ? `&w=${o}` : ""}`;

  return (
    <AppShell>
      <Reveal className="space-y-4" stagger={0.06}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center corner-cut grad-emerald text-white shadow-md lg:size-11">
            <BarChart3 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-semibold lg:text-2xl">Analytics</h1>
            <p className="text-xs text-muted-foreground lg:text-sm">
              {a.periodLabel}
              {a.offset === 0 ? (mode === "week" ? " · this week" : " · this month") : ""}
            </p>
          </div>
          {/* Period pager — flip back through past weeks/months */}
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={pageHref(offset + 1, mode)}
              aria-label={mode === "week" ? "Previous week" : "Previous month"}
              className="grid size-9 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </Link>
            {offset > 0 ? (
              <Link
                href={pageHref(offset - 1, mode)}
                aria-label={mode === "week" ? "Next week" : "Next month"}
                className="grid size-9 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span aria-hidden className="grid size-9 place-items-center rounded-xl border border-border/40 bg-card/50 text-muted-foreground/40">
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>

        {/* Weekly / Monthly switch */}
        <div className="flex rounded-2xl border border-border/60 bg-card p-1">
          <Link
            href={pageHref(0, "week")}
            className={`flex-1 rounded-xl py-2 text-center text-sm font-semibold transition-colors ${
              mode === "week" ? "grad-blue text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </Link>
          <Link
            href={pageHref(0, "month")}
            className={`flex-1 rounded-xl py-2 text-center text-sm font-semibold transition-colors ${
              mode === "month" ? "grad-violet text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </Link>
        </div>

        {/* Headline mini stats */}
        <div className="grid grid-cols-2 gap-2 [&>*:last-child]:col-span-2 lg:grid-cols-5 lg:gap-3 lg:[&>*:last-child]:col-span-1">
          <MiniStat grad="grad-coral" shape="corner-cut" icon={<Flame className="size-5" />} value={a.totalHabitCompletions} label="Habit completions" />
          <MiniStat grad="grad-indigo" shape="corner-alt" icon={<Clock className="size-5" />} value={focusHours} decimals={1} suffix="h" label="Focus time" />
          <MiniStat grad="grad-violet" shape="corner-cut" icon={<TrendingUp className="size-5" />} value={a.avgSelfRespect ?? 0} decimals={1} suffix="/10" label="Avg self-respect" />
          <MiniStat grad="grad-blue" shape="corner-alt" icon={<TrendingUp className="size-5" />} value={a.avgEnergy ?? 0} decimals={1} suffix="/10" label="Avg energy" />
          <MiniStat grad="grad-emerald" shape="corner-cut" icon={<PenLine className="size-5" />} value={a.journaledDays} suffix={` of ${a.windowDays}`} label={a.offset === 0 ? "Days journaled so far" : "Days journaled"} />
        </div>

        {/* Deep stats — the numbers behind the story */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          <DeepStat icon={<Trophy className="size-4 text-[var(--emerald)]" />} value={`${a.perfectDays}`} label="Perfect days" hint="every habit done" />
          <DeepStat icon={<Link2 className="size-4 text-primary" />} value={`${a.bestChain}d`} label="Best chain" hint="days in a row active" />
          <DeepStat icon={<Gauge className="size-4 text-[var(--violet)]" />} value={`${a.avgPerDay}`} label="Habits / day" hint="average" />
          <DeepStat icon={<CircleSlash className="size-4 text-[var(--coral)]" />} value={`${a.zeroDays}`} label="Zero days" hint="nothing logged" />
        </div>

        {/* Plan vs reality — the week's plan scored, or the month's goals */}
        {mode === "week" && a.weekPlan && <WeekPlanReport plan={a.weekPlan} />}
        {mode === "month" && a.monthPlan && <MonthPlanReport plan={a.monthPlan} />}

        {/* The written report — what moved, what stuck, what to fix */}
        <WrittenReport
          days={a.days}
          perHabit={a.perHabit}
          bestDow={a.bestDow}
          worstDow={a.worstDow}
          journaledDays={a.journaledDays}
          rangeLabel={a.periodLabel}
          mode={mode}
        />

        {/* Per-habit table — which task did how much. Full calendar dates so the
            week always shows 7 cells, future days rendered as still-to-come. */}
        <PerHabitTable habits={a.perHabit} dates={a.fullDays.map((d) => d.date)} rangeLabel={a.periodLabel} mode={mode} />

        {/* Slipping — attention first */}
        <SlippingHabits habits={a.slipping} />

        {/* Time + pattern — week: weekday leak-finder; month: week-by-week chunks */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TimeByHabit items={a.timeByHabit} totalMinutes={a.totalMinutes} />
          {mode === "week" ? (
            <DayOfWeekPattern dow={a.dow} best={a.bestDow} worst={a.worstDow} />
          ) : (
            <WeekByWeek days={a.fullDays} today={a.today} totalHabits={tickableHabits} />
          )}
        </div>

        {/* Correlations */}
        <Correlations items={a.correlations} />

        {/* Trend (wide) + rings (stacked) — full calendar axis, future days just have no line yet */}
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <TrendChart days={a.fullDays} />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:col-span-4">
            <RingStat value={a.habitCompletionRate} label="Habit completion" sublabel="logged" stroke="var(--emerald)" />
            <RingStat value={a.checkinHonestyRate} label="Follow-through" sublabel="done/partial" stroke="var(--violet)" />
          </div>
        </div>

        {/* Week: daily bars. Month: the full calendar map instead — 30 bars on a phone is noise. */}
        {mode === "week" ? <HabitBars days={a.fullDays} today={a.today} /> : <HabitHeatmap days={a.fullDays} today={a.today} totalHabits={tickableHabits} />}

        {/* Streaks */}
        <section className="card-elevated p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Current streaks
          </h3>
          {a.streaks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No habits tracked yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {a.streaks.map((s) => (
                <div key={s.name} className="rounded-2xl bg-card/70 p-3">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="mt-1 font-display text-xl font-bold text-primary">{s.streak}d</p>
                  <p className="text-xs text-muted-foreground">best {s.best}d</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </AppShell>
  );
}

function DeepStat({
  icon,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="card-surface rounded-2xl p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-display text-lg font-bold tabular-nums leading-none">{value}</span>
      </div>
      <p className="mt-1.5 text-xs font-semibold">{label}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function MiniStat({
  grad,
  icon,
  value,
  label,
  decimals,
  suffix,
  shape = "",
}: {
  grad: string;
  icon: React.ReactNode;
  value: number;
  label: string;
  decimals?: number;
  suffix?: string;
  shape?: string;
}) {
  return (
    <div className={`tile ${grad} ${shape} p-3 lg:p-4`}>
      {/* mobile: compact horizontal stat · desktop: vertical tile */}
      <div className="relative z-10 flex items-center gap-3 lg:block">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm lg:size-10">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold leading-none tracking-tight drop-shadow-sm lg:mt-3 lg:text-3xl">
            <CountUp value={value} decimals={decimals ?? 0} suffix={suffix ?? ""} />
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-white/90 lg:mt-1.5 lg:text-xs">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
