import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sunrise,
  MoonStar,
  Flame,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CoachAvatar, COACH_NAME, type CoachMood } from "@/components/coach-avatar";
import { EnablePushButton } from "@/components/enable-push-button";
import { DumpBox } from "@/components/dump-box";
import { KeyNudge } from "@/components/key-nudge";
import { DailyQuote } from "@/components/daily-quote";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { hasCompletedOnboarding } from "@/lib/actions/onboarding";
import { getTodayStatus } from "@/lib/actions/morning";
import { getHabitDashboard } from "@/lib/actions/habits";
import { createCheckinsFromTodayPlan, getTodayCheckins } from "@/lib/actions/checkins";
import { getAnalytics } from "@/lib/actions/analytics";
import { getOpenLoopsCount } from "@/lib/actions/thoughts";
import { getAppUser } from "@/lib/actions/profile";
import { greeting, prettyToday, todayISO, periodMonth, prettyMonth } from "@/lib/date";
import { quoteForDate } from "@/lib/quotes";
import { storyForSituation } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const onboarded = await hasCompletedOnboarding();
  if (!onboarded) redirect("/onboarding");

  const { plan, journal } = await getTodayStatus();
  const morningDone = Boolean(plan?.locked);
  const eveningDone = Boolean(journal?.evening);

  if (morningDone) await createCheckinsFromTodayPlan();

  const [{ identityHabits, activeStretch, completedToday }, checkins, analytics, openLoops, appUser] =
    await Promise.all([getHabitDashboard(), getTodayCheckins(), getAnalytics(), getOpenLoopsCount(), getAppUser()]);

  const trackedHabits = [...identityHabits, ...(activeStretch ? [activeStretch] : [])];
  const habitsDone = trackedHabits.filter((h) => completedToday.has(h.id)).length;
  const bestStreak = trackedHabits.reduce((m, h) => Math.max(m, h.streak), 0);
  const schedule: { time: string; block: string; priority?: number }[] = Array.isArray(plan?.schedule)
    ? (plan!.schedule as { time: string; block: string; priority?: number }[])
    : [];
  const answeredCheckins = checkins.filter((c) => c.response).length;
  const pendingCheckins = checkins.length - answeredCheckins;

  // "How you actually performed today" — honest completion of everything on today's plate
  const dayUnits = [
    morningDone,
    eveningDone,
    ...trackedHabits.map((h) => completedToday.has(h.id)),
    ...checkins.map((c) => Boolean(c.response)),
  ];
  const doneUnits = dayUnits.filter(Boolean).length;
  const totalUnits = Math.max(1, dayUnits.length);
  const dayPct = Math.round((doneUnits / totalUnits) * 100);

  const mood: CoachMood = eveningDone ? "proud" : !morningDone ? "pushing" : "happy";
  const coachLine = eveningDone
    ? "Day closed out. Rest is part of the work — see you at sunrise."
    : !morningDone
      ? "Nothing's planned yet. Let's set the tone before the day runs you."
      : pendingCheckins > 0
        ? `You've got ${pendingCheckins} check-in${pendingCheckins > 1 ? "s" : ""} waiting. Be honest with them.`
        : "Plan's locked. Now go prove it — one priority at a time.";

  const pulseVerdict =
    dayPct >= 80 ? "Strong day. This is the standard." :
    dayPct >= 50 ? "Halfway honest. Close the gaps before tonight." :
    dayPct > 0 ? "Slipping. Pick one thing and do it now." :
    "Nothing done yet. The plan means nothing until you move.";

  const quote = quoteForDate(todayISO());
  const dayIndex = Math.floor(Date.parse(todayISO()) / 86_400_000);
  // Story matched to how today is actually going — not a blind rotation.
  const { story: todayStory, reason: storyReason } = storyForSituation({
    emotion: (journal?.emotion as string | null) ?? null,
    energy: (journal?.energy as number | null) ?? null,
    selfRespect: analytics.avgSelfRespect ?? null,
    dayPct,
    daySeed: dayIndex,
  });

  return (
    <AppShell>
      <Reveal className="flex flex-col gap-2.5" stagger={0.06}>
        {/* One-time Leo nudge: no Gemini key yet → point to the profile guide. */}
        <KeyNudge hasKey={appUser?.hasGeminiKey ?? true} />

        {/* Band 1 — Leo hero + KPI 2x2 + today's quote. One row on desktop, zero dead space. */}
        <section className="grid gap-2.5 lg:shrink-0 lg:grid-cols-12">
          <div className="card-tint tint-blue corner-cut relative overflow-hidden p-3.5 lg:col-span-5">
            <div className="relative flex h-full items-center gap-3 lg:gap-4">
              <CoachAvatar mood={mood} size={48} className="shrink-0 lg:hidden" />
              <CoachAvatar mood={mood} size={56} className="hidden shrink-0 lg:block" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground lg:text-xs">{prettyToday()}</p>
                <h1 className="font-display text-[17px] font-semibold lg:text-lg">
                  <span className="text-gradient">{greeting()}</span>
                </h1>
                <p className="mt-0.5 max-w-md text-[13px] leading-snug text-muted-foreground lg:mt-1 lg:pr-8 lg:text-sm">
                  <span className="font-semibold text-foreground">{COACH_NAME}:</span> {coachLine}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:col-span-3">
            <Tile grad="grad-coral" shape="corner-cut" icon={<Flame className="size-5" />} value={habitsDone} suffix={`/${trackedHabits.length}`} label="Habits today" />
            <Tile grad="grad-emerald" shape="corner-alt" icon={<Sparkles className="size-5" />} value={bestStreak} suffix="d" label="Best streak" />
            <Tile grad="grad-blue" shape="corner-cut" icon={<HeartHandshake className="size-5" />} value={analytics.avgSelfRespect ?? 0} decimals={1} label="Self-respect avg" />
            <Tile grad="grad-indigo" shape="corner-alt" icon={<Sparkles className="size-5" />} value={openLoops} label="Open loops" />
          </div>

          <div className="lg:col-span-4">
            <DailyQuote quote={quote} />
          </div>
        </section>

        {/* Band 2 — the working row: pulse, check-ins, schedule, calendar side by side */}
        <section className="grid gap-2.5 lg:flex-1 lg:grid-cols-12">
          {/* Performance pulse */}
          <div className="card-elevated min-w-0 p-3 lg:col-span-3">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Target className="size-4 text-primary" /> Today&apos;s momentum
              </h2>
              <span className="text-sm font-medium text-muted-foreground">{doneUnits}/{totalUnits}</span>
            </div>
            <p className="font-display text-2xl font-bold leading-none text-gradient">
              <CountUp value={dayPct} suffix="%" />
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{pulseVerdict}</p>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full grad-blue transition-all"
                style={{ width: `${Math.max(dayPct, 3)}%` }}
              />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <PulseStat label="Morning" ok={morningDone} />
              <PulseStat label="Habits" text={`${habitsDone}/${trackedHabits.length}`} ok={trackedHabits.length > 0 && habitsDone === trackedHabits.length} />
              <PulseStat label="Check-ins" text={`${answeredCheckins}/${checkins.length}`} ok={checkins.length > 0 && pendingCheckins === 0} />
              <PulseStat label="Evening" ok={eveningDone} />
            </div>
          </div>

          {/* Check-in space */}
          <div className="card-elevated min-w-0 p-3 lg:col-span-3">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <CheckCircle2 className="size-4 text-primary" /> Your check-ins
              </h2>
              {pendingCheckins > 0 && (
                <span className="prio-2 prio-chip rounded-full px-2.5 py-1 text-xs font-semibold">{pendingCheckins} due</span>
              )}
            </div>
            {checkins.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                {morningDone
                  ? "No check-ins for today yet — they appear from your locked plan."
                  : "Lock your morning plan and check-ins show up here through the day."}
              </p>
            ) : (
              <div className="space-y-2">
                {/* mobile: full list · desktop keeps the 4-row bento cap */}
                {checkins.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/checkin/${c.id}`}
                    className={`flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      i >= 4 ? "lg:hidden" : ""
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      {c.response ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{c.prompt}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs font-medium capitalize text-muted-foreground">
                      {c.response ?? "pending"}
                    </span>
                  </Link>
                ))}
                {checkins.length > 4 && (
                  <p className="hidden px-1 text-xs font-medium text-muted-foreground lg:block">
                    +{checkins.length - 4} more through the day
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 lg:col-span-3">
            <Panel
              title="Today's schedule"
              icon={<CalendarClock className="size-4" />}
              action={{ href: "/schedule", label: "Open" }}
            >
              {schedule.length === 0 ? (
                <EmptyRow text="No time blocks yet — build your day on Schedule." href="/schedule" cta="Add blocks" />
              ) : (
                <ol className="space-y-1.5">
                  {/* mobile: full day · desktop keeps the 4-row bento cap */}
                  {schedule.map((s, i) => (
                    <li
                      key={i}
                      className={`prio-${s.priority ?? 2} prio-band flex items-center gap-3 rounded-xl py-2 pl-3 pr-3 ${
                        i >= 4 ? "lg:hidden" : ""
                      }`}
                    >
                      <span className="w-16 shrink-0 font-mono text-xs font-semibold text-primary">{s.time || "—"}</span>
                      <span className="truncate text-sm">{s.block}</span>
                    </li>
                  ))}
                  {schedule.length > 4 && (
                    <li className="hidden px-1 text-xs font-medium text-muted-foreground lg:block">
                      +{schedule.length - 4} more — open Schedule
                    </li>
                  )}
                </ol>
              )}
            </Panel>
          </div>

          <div className="min-w-0 lg:col-span-3">
            <MiniCalendar />
          </div>
        </section>

        {/* Band 3 — bento: rituals stack · untangle · story hero. Mixed shapes + sizes, no scroll. */}
        <section className="grid gap-2.5 lg:flex-1 lg:grid-cols-12">
          {/* Left — two ritual bars, deliberately unlike each other */}
          <div className="flex flex-col gap-2.5 lg:col-span-4">
            <Link
              href="/morning"
              className="group card-tint tint-coral corner-cut relative flex flex-1 items-center gap-3.5 overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl grad-coral text-white shadow-md transition-transform group-hover:scale-105">
                <Sunrise className="size-5" />
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Morning journal</p>
                <p className="truncate font-display text-base font-semibold">
                  {morningDone ? "Planned & locked in" : "Plan the day"}
                </p>
              </div>
              {morningDone && <CheckCircle2 className="relative size-5 shrink-0 text-emerald" />}
              <ArrowRight className="relative size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>

            <Link
              href="/evening"
              className="group card-tint tint-indigo corner-cut relative flex flex-1 items-center gap-3.5 overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl grad-indigo text-white shadow-md transition-transform group-hover:scale-105">
                <MoonStar className="size-5" />
              </span>
              <div className="relative min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evening reflection</p>
                <p className="truncate font-display text-base font-semibold">
                  {eveningDone ? "Reflected & closed out" : morningDone ? "Reflect on today" : "Finish your morning first"}
                </p>
              </div>
              {eveningDone && <CheckCircle2 className="relative size-5 shrink-0 text-emerald" />}
              <ArrowRight className="relative size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>

          {/* Middle — untangle, the narrow working column */}
          <div className="min-w-0 lg:col-span-3">
            <DumpBox openLoops={openLoops} />
          </div>

          {/* Right — the hero: willpower story, biggest card, its own shape */}
          <Link
            href="/stories"
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl lg:col-span-5"
          >
            <div className={`pointer-events-none absolute inset-0 ${todayStory.grad} opacity-[0.06]`} />
            <div className="relative flex items-center justify-between">
              <span className="chip bg-primary/10 text-primary">Willpower story for you</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
            <p className="relative mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Why this one: {storyReason}.
            </p>
            <div className="relative mt-3.5 flex items-center gap-4">
              <span className={`grid size-16 shrink-0 place-items-center rounded-3xl ${todayStory.grad} font-display text-xl font-bold text-white shadow-lg transition-transform group-hover:scale-105`}>
                {todayStory.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-bold">{todayStory.name}</p>
                <p className="truncate text-xs text-muted-foreground">{todayStory.field}</p>
              </div>
            </div>
            <p className="relative mt-3.5 font-display text-base font-semibold leading-snug">{todayStory.headline}</p>
            <p className="relative mt-auto border-t border-border/60 pt-3 text-sm italic leading-snug text-muted-foreground">
              &ldquo;{todayStory.lesson}&rdquo;
            </p>
          </Link>
        </section>

        <EnablePushButton />
      </Reveal>
    </AppShell>
  );
}

/** Current month at a glance — today ringed in the brand gradient, past days link to their schedule. */
function MiniCalendar() {
  const iso = todayISO();
  const [y, m, d] = iso.split("-").map(Number);
  const startOffset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Panel
      title={prettyMonth(periodMonth())}
      icon={<CalendarDays className="size-4" />}
      action={{ href: "/schedule", label: "Open" }}
    >
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
          <span key={i} className="text-[10px] font-semibold uppercase text-muted-foreground/70">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          if (day === d) {
            return (
              <span
                key={i}
                className="mx-auto grid size-7 place-items-center rounded-full grad-blue text-xs font-bold text-white shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
              >
                {day}
              </span>
            );
          }
          if (day < d) {
            const dayISO = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return (
              <Link
                key={i}
                href={`/schedule?date=${dayISO}`}
                className="mx-auto grid size-7 place-items-center rounded-full text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {day}
              </Link>
            );
          }
          return (
            <span key={i} className="mx-auto grid size-7 place-items-center text-xs text-muted-foreground/45">
              {day}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}

function PulseStat({ label, ok, text }: { label: string; ok: boolean; text?: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${ok ? "text-emerald" : "text-foreground"}`}>
        {text ?? (ok ? "Done" : "Open")}
      </p>
    </div>
  );
}

function Tile({
  grad,
  icon,
  value,
  suffix,
  decimals,
  label,
  shape = "",
}: {
  grad: string;
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
  shape?: string;
}) {
  return (
    <div className={`tile ${grad} ${shape} p-2.5 lg:p-2.5`}>
      {/* mobile: compact horizontal stat · desktop: original vertical tile */}
      <div className="relative flex items-center gap-2.5 lg:block">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/20 lg:size-7 lg:rounded-lg">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none lg:mt-1.5 lg:text-xl">
            <CountUp value={value} decimals={decimals ?? 0} suffix={suffix ?? ""} />
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-white/85 lg:mt-1 lg:text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="card-elevated h-full p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {action && (
          <Link href={action.href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {action.label} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href={href} className="text-sm font-semibold text-primary hover:underline">
        {cta}
      </Link>
    </div>
  );
}
