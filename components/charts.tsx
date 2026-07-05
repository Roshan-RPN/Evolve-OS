"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Shuffle,
  Target,
  XCircle,
  Undo2,
  CalendarClock,
  CircleDashed,
} from "lucide-react";
import type {
  DayPoint,
  HabitInsight,
  DowPoint,
  Correlation,
  WeekPlanInsight,
  MonthPlanInsight,
  AnalyticsMode,
} from "@/lib/actions/analytics";
import { iconFor } from "@/lib/habit-icons";
import { habitColorValue } from "@/lib/habit-colors";

function fmtMinutes(m: number) {
  if (m <= 0) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/* Circular progress ring */
export function RingStat({
  value,
  label,
  sublabel,
  stroke = "var(--violet)",
}: {
  value: number;
  label: string;
  sublabel?: string;
  stroke?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="card-surface flex flex-col items-center rounded-3xl p-4 lg:p-5">
      <div className="relative size-28">
        <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="9" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (pct / 100) * c }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-bold">{Math.round(value)}%</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

/* Dual gradient-area trend: energy (blue) + self-respect (teal), scale 0..10 */
export function TrendChart({ days }: { days: DayPoint[] }) {
  const n = days.length;
  const x = (i: number) => (n <= 1 ? 2 : (i / (n - 1)) * 96 + 2);
  const y = (v: number) => 38 - (v / 10) * 34;

  const coords = (key: "energy" | "selfRespect") =>
    days
      .map((d, i) => (d[key] == null ? null : ([x(i), y(d[key] as number)] as const)))
      .filter((p): p is readonly [number, number] => p !== null);

  const series = [
    { key: "energy" as const, color: "var(--blue)", id: "trend-energy", label: "Energy", pts: coords("energy") },
    { key: "selfRespect" as const, color: "var(--teal)", id: "trend-sr", label: "Self-respect", pts: coords("selfRespect") },
  ];

  return (
    <div className="card-surface rounded-3xl p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Energy vs. self-respect</h3>
        <div className="flex items-center gap-3 text-xs">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 100 40" className="h-40 w-full" preserveAspectRatio="none">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={s.id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 10, 20, 30].map((gy) => (
          <line key={gy} x1="0" y1={gy + 4} x2="100" y2={gy + 4} stroke="var(--border)" strokeWidth="0.3" />
        ))}
        {series.map(
          (s, si) =>
            s.pts.length > 0 && (
              <g key={s.id}>
                {s.pts.length > 1 && (
                  <motion.polygon
                    points={`${s.pts.map(([px, py]) => `${px},${py}`).join(" ")} ${s.pts[s.pts.length - 1][0]},38 ${s.pts[0][0]},38`}
                    fill={`url(#${s.id})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 + si * 0.15 }}
                  />
                )}
                <motion.polyline
                  points={s.pts.map(([px, py]) => `${px},${py}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: si * 0.15 }}
                />
                {/* endpoint dot */}
                <motion.circle
                  cx={s.pts[s.pts.length - 1][0]}
                  cy={s.pts[s.pts.length - 1][1]}
                  r="1.8"
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth="0.8"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 1 + si * 0.15 }}
                />
              </g>
            )
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {days.map((d, i) => {
          const step = n > 10 ? Math.ceil(n / 8) : n > 8 ? 2 : 1;
          const show = i % step === 0 || i === n - 1;
          return (
            <span key={i} className={show ? "" : "opacity-0"}>
              {n > 10 ? Number(d.date.slice(8, 10)) : d.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* Vertical bars — habits completed per day. `today` marks the cutoff: later
   days render as still-to-come placeholders so the week always shows 7 slots. */
export function HabitBars({ days, today }: { days: DayPoint[]; today?: string }) {
  const max = Math.max(1, ...days.map((d) => d.habitsDone));
  // Y-axis ticks: max at top, mid, 0 — so bar height reads as a real count.
  const ticks = [max, Math.round(max / 2), 0];
  // Month view = ~30 bars; thin them out and only label every 5th date.
  const dense = days.length > 16;
  return (
    <div className="card-surface rounded-3xl p-4 lg:p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold">Habits completed / day</h3>
        <span className="text-[11px] text-muted-foreground">peak {max}/day</span>
      </div>
      <div className="flex gap-2">
        {/* Y axis */}
        <div className="flex h-32 flex-col justify-between py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {ticks.map((t, i) => (
            <span key={i} className="leading-none">{t}</span>
          ))}
        </div>
        {/* Plot */}
        <div className="relative flex-1">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-0 flex h-32 flex-col justify-between">
            {ticks.map((_, i) => (
              <span key={i} className="border-t border-border/50" />
            ))}
          </div>
          <div className={`flex h-40 items-end justify-between ${dense ? "gap-[3px]" : "gap-1.5"}`}>
            {days.map((d, i) => {
              const future = today ? d.date > today : false;
              const h = (d.habitsDone / max) * 100;
              const ratio = d.habitsDone / max;
              // colour tells the story: deep red = weak day, coral = mid, green = strong
              const grad = ratio >= 0.75 ? "grad-emerald" : ratio >= 0.4 ? "grad-coral" : "grad-rose";
              const showDate = !dense || i % 5 === 0 || i === days.length - 1;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-32 w-full items-end justify-center">
                    <motion.div
                      className={`w-full max-w-9 rounded-full ${
                        future
                          ? "border border-dashed border-border/70 bg-transparent"
                          : d.habitsDone
                            ? grad
                            : "bg-muted"
                      }`}
                      initial={{ height: 0 }}
                      animate={{ height: `${future ? 4 : Math.max(h, d.habitsDone ? 10 : 4)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.03, ease: "easeOut" }}
                    />
                    {!dense && d.habitsDone > 0 && (
                      <span className="absolute inset-x-0 -top-4 text-center text-[10px] font-semibold tabular-nums text-foreground/70">
                        {d.habitsDone}
                      </span>
                    )}
                  </div>
                  {!dense && <span className="text-[10px] text-muted-foreground">{d.label.slice(0, 1)}</span>}
                  <span className={`-mt-1 text-[9px] tabular-nums text-muted-foreground/70 ${showDate ? "" : "opacity-0"}`}>
                    {Number(d.date.slice(8, 10))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Month map colours — a completion scale that reads like a report card:
   green = everything done, lighter green 80–99%, blue 60–80%, lighter blue
   40–60%, yellow 20–40%, red below 20%. Zero days stay neutral so a miss
   reads as a gap, not a punishment. */
function dayTone(ratio: number): { bg: string; fg: string } {
  if (ratio <= 0) return { bg: "var(--muted)", fg: "var(--muted-foreground)" };
  if (ratio >= 1) return { bg: "oklch(0.58 0.15 155)", fg: "white" }; // all done — green
  if (ratio >= 0.8) return { bg: "oklch(0.78 0.13 158)", fg: "oklch(0.3 0.09 158)" }; // lighter green
  if (ratio >= 0.6) return { bg: "oklch(0.58 0.16 245)", fg: "white" }; // blue
  if (ratio >= 0.4) return { bg: "oklch(0.8 0.09 235)", fg: "oklch(0.34 0.1 245)" }; // lighter blue
  if (ratio >= 0.2) return { bg: "oklch(0.85 0.14 92)", fg: "oklch(0.36 0.07 90)" }; // yellow
  return { bg: "oklch(0.62 0.2 27)", fg: "white" }; // below 20% — red
}

/* Month map — a real calendar grid (Mon-start columns), one cell per date.
   Each cell carries its own meaning (date + done/total fraction) and an
   insight strip above the grid says what the month actually looked like,
   so the map reads as a story rather than an abstract mosaic. */
export function HabitHeatmap({
  days,
  today,
  totalHabits,
}: {
  days: DayPoint[];
  today?: string;
  totalHabits?: number;
}) {
  const cutoff = today ?? days[days.length - 1]?.date ?? "";
  const past = days.filter((d) => d.date <= cutoff);
  const denom = Math.max(1, totalHabits ?? Math.max(...past.map((d) => d.habitsDone), 1));
  // pad the first row so dates land under their real weekday (Mon-start)
  const offset = days.length ? (new Date(days[0].date + "T00:00:00").getDay() + 6) % 7 : 0;
  const WD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const activeDays = past.filter((d) => d.habitsDone > 0).length;
  const perfectDays = past.filter((d) => d.habitsDone >= denom).length;

  // --- plain-language insights, computed from the same days the grid shows ---
  const prettyDay = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const bestDay = past.reduce<DayPoint | null>(
    (best, d) => (d.habitsDone > 0 && d.habitsDone > (best?.habitsDone ?? 0) ? d : best),
    null
  );

  // longest unbroken run of days with at least one habit done
  let bestRun = 0;
  let run = 0;
  for (const d of past) {
    run = d.habitsDone > 0 ? run + 1 : 0;
    if (run > bestRun) bestRun = run;
  }

  // weakest weekday — only once there's enough of the month to judge
  let weakDow: string | null = null;
  if (activeDays >= 5 && past.length >= 14) {
    const byDow = new Map<number, { sum: number; n: number }>();
    for (const d of past) {
      const dow = new Date(d.date + "T00:00:00").getDay();
      const cur = byDow.get(dow) ?? { sum: 0, n: 0 };
      byDow.set(dow, { sum: cur.sum + d.habitsDone, n: cur.n + 1 });
    }
    let worst: { dow: number; avg: number } | null = null;
    for (const [dow, { sum, n }] of byDow) {
      if (n < 2) continue;
      const a = sum / n;
      if (!worst || a < worst.avg) worst = { dow, avg: a };
    }
    if (worst) {
      weakDow = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][
        worst.dow
      ];
    }
  }

  return (
    <div className="card-elevated p-4 lg:p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Month map</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>0%</span>
          {[
            "oklch(0.62 0.2 27)",
            "oklch(0.85 0.14 92)",
            "oklch(0.8 0.09 235)",
            "oklch(0.58 0.16 245)",
            "oklch(0.78 0.13 158)",
            "oklch(0.58 0.15 155)",
          ].map((c) => (
            <i key={c} className="size-3 rounded-full" style={{ background: c }} />
          ))}
          <span>100%</span>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        One box per day. The number inside is <strong>habits done / your list</strong>. Colour tracks
        how full the day got — <strong>red</strong> under 20%, up through yellow and blue, to
        <strong> green</strong> when everything&apos;s done. Dashed days haven&apos;t happened yet.
      </p>

      {activeDays === 0 ? (
        <p className="mb-3 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
          Nothing logged this month yet — tick habits on the Habits page and this calendar fills in.
        </p>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
          <MonthInsight
            label="Best day"
            value={bestDay ? `${prettyDay(bestDay.date)} · ${bestDay.habitsDone}/${denom}` : "—"}
          />
          <MonthInsight
            label="Longest run"
            value={bestRun > 1 ? `${bestRun} days straight` : `${bestRun} day`}
          />
          <MonthInsight label="Perfect days" value={`${perfectDays} of ${past.length}`} />
          <MonthInsight label="Weak spot" value={weakDow ? `${weakDow} lag` : "too early to tell"} />
        </div>
      )}

      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WD.map((w) => (
          <span key={w} className="text-center text-[9px] font-semibold uppercase text-muted-foreground/70">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {days.map((d, i) => {
          const num = Number(d.date.slice(8, 10));
          if (d.date > cutoff) {
            return (
              <span
                key={d.date}
                className="grid aspect-square place-items-center rounded-xl border border-dashed border-border/60 text-[10px] font-semibold tabular-nums text-muted-foreground/40"
              >
                {num}
              </span>
            );
          }
          const ratio = d.habitsDone / denom;
          const tone = dayTone(ratio);
          return (
            <motion.div
              key={d.date}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl ${
                d.date === today ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              } ${ratio >= 1 ? "shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.45)]" : ""}`}
              title={`${d.date}: ${d.habitsDone} of ${denom} habit${denom === 1 ? "" : "s"} done`}
              style={{ background: tone.bg }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.015 }}
            >
              <span
                className="text-[10px] font-bold leading-tight tabular-nums"
                style={{ color: tone.fg, opacity: ratio <= 0 ? 0.6 : 0.95 }}
              >
                {num}
              </span>
              <span
                className="text-[9px] font-semibold leading-tight tabular-nums"
                style={{ color: tone.fg, opacity: ratio <= 0 ? 0.45 : 0.8 }}
              >
                {d.habitsDone > 0 ? `${d.habitsDone}/${denom}` : "·"}
              </span>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Active on {activeDays} of {past.length} day{past.length === 1 ? "" : "s"} so far
        {perfectDays > 0 ? ` · ${perfectDays} perfect` : ""}.
      </p>
    </div>
  );
}

function MonthInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

/* Month, week by week — one bar per calendar week (Mon-start), so a monthly
   report reads in month-sized chunks instead of a weekday average. */
export function WeekByWeek({
  days,
  today,
  totalHabits,
}: {
  days: DayPoint[];
  today?: string;
  totalHabits: number;
}) {
  const cutoff = today ?? days[days.length - 1]?.date ?? "";
  const offset = days.length ? (new Date(days[0].date + "T00:00:00").getDay() + 6) % 7 : 0;
  const weeks: { nums: number[]; done: number; elapsed: number }[] = [];
  days.forEach((d, i) => {
    const w = Math.floor((offset + i) / 7);
    if (!weeks[w]) weeks[w] = { nums: [], done: 0, elapsed: 0 };
    weeks[w].nums.push(Number(d.date.slice(8, 10)));
    if (d.date <= cutoff) {
      weeks[w].elapsed += 1;
      weeks[w].done += d.habitsDone;
    }
  });
  const denom = Math.max(1, totalHabits);

  return (
    <div className="card-surface rounded-3xl p-4 lg:p-5">
      <h3 className="mb-1 font-display text-base font-semibold">Month, week by week</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Each bar = one week of the month: how much of your habit list you hit. Spots the week the
        month sagged.
      </p>
      <div className="space-y-3">
        {weeks.map((w, i) => {
          const possible = w.elapsed * denom;
          const rate = possible ? Math.round((w.done / possible) * 100) : null;
          const partial = w.elapsed > 0 && w.elapsed < w.nums.length;
          const tone =
            rate === null ? "bg-muted" : rate >= 70 ? "grad-emerald" : rate >= 40 ? "grad-coral" : "grad-rose";
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs font-semibold">Week {i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between text-[10px] text-muted-foreground">
                  <span className="tabular-nums">
                    {w.nums[0]}–{w.nums[w.nums.length - 1]}
                    {partial ? " · in progress" : rate === null ? " · upcoming" : ""}
                  </span>
                  <span className="tabular-nums">
                    {rate === null ? "—" : `${w.done} done · ${rate}%`}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  {rate !== null && (
                    <motion.div
                      className={`h-full rounded-full ${tone}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(rate, w.done ? 4 : 0)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Donut / pie — habit-completion share across the window */
export function DonutChart({
  items,
  title = "Where your effort went",
}: {
  items: { name: string; count: number }[];
  title?: string;
}) {
  // 12 distinct hues before any repeat — matches the scoreboard's grad order
  const palette = [
    "var(--blue)", "var(--violet)", "var(--teal)", "var(--emerald)", "var(--coral)", "var(--indigo)",
    "oklch(0.71 0.13 220)", "oklch(0.65 0.21 22)", "var(--bronze)", "oklch(0.52 0.11 160)",
    "oklch(0.49 0.035 256)", "var(--red)",
  ];
  const total = items.reduce((s, i) => s + i.count, 0);
  const r = 40;
  const c = 2 * Math.PI * r;

  const segs = items.reduce<
    { name: string; count: number; color: string; frac: number; dash: number; gap: number; rot: number }[]
  >((acc, item, i) => {
    const frac = total ? item.count / total : 0;
    const rot = acc.length ? acc[acc.length - 1].rot + acc[acc.length - 1].dash : 0;
    acc.push({ ...item, color: palette[i % palette.length], frac, dash: frac * c, gap: c - frac * c, rot });
    return acc;
  }, []);

  return (
    <div className="card-elevated p-4 lg:p-5">
      <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No completions logged yet in the last 14 days.</p>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
              {segs.map((s, i) => (
                <motion.circle
                  key={s.name}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeDasharray={`${s.dash} ${s.gap}`}
                  strokeDashoffset={-s.rot}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <span className="font-display text-xl font-bold">{total}</span>
                <p className="text-[10px] text-muted-foreground">done</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {segs.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <i className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 truncate font-medium">{s.name}</span>
                <span className="text-muted-foreground">{Math.round(s.frac * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Habit scoreboard — one card per habit: icon tile, "N of M days", streak, rate chip,
   dated day cells (week) or a rate bar (month). */
export function PerHabitTable({
  habits,
  dates,
  rangeLabel,
  mode = "week",
}: {
  habits: HabitInsight[];
  dates?: string[]; // ISO dates matching each strip cell, oldest → newest
  rangeLabel?: string;
  mode?: AnalyticsMode;
}) {
  const anyTime = habits.some((h) => h.minutes > 0);
  const monthly = mode === "month";
  // 12 distinct tile colours before any repeat — same order as the donut palette
  const grads = [
    "grad-blue", "grad-violet", "grad-teal", "grad-emerald", "grad-coral", "grad-indigo",
    "grad-sky", "grad-rose", "grad-bronze", "grad-forest", "grad-slate", "grad-amber",
  ];
  return (
    <div className="card-elevated p-4 lg:p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold">Habit scoreboard</h3>
        <span className="text-[11px] text-muted-foreground">{rangeLabel ?? "this week"}</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        One card per habit — on how many of the {monthly ? "month" : "week"}&apos;s days it actually happened.
      </p>
      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No habits tracked yet.</p>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {habits.map((h, i) => {
            const grad = grads[i % grads.length];
            // The habit's own chosen colour drives its tile / cells / bar; fall back
            // to the rotating palette when no colour is set (pre-migration or unset).
            const tint = habitColorValue(h.color);
            const tintClass = tint ? "" : grad;
            const tintStyle = tint ? { backgroundColor: tint } : undefined;
            const rateTone = h.rate >= 70 ? "grad-emerald" : h.rate >= 40 ? "grad-coral" : "grad-rose";
            const HabitIcon = iconFor(h);
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="rounded-2xl border border-border/50 bg-card/70 p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${tintClass} text-white shadow-sm`}
                    style={tintStyle}
                  >
                    <HabitIcon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{h.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-muted-foreground">
                      <span className="tabular-nums">
                        {h.doneCount} of {!monthly && dates?.length ? dates.length : h.days.length} days
                      </span>
                      {h.streak > 0 && (
                        <span className="inline-flex items-center gap-0.5 tabular-nums text-primary">
                          <Flame className="size-3" /> {h.streak}d streak
                        </span>
                      )}
                      {anyTime && h.minutes > 0 && <span className="tabular-nums">{fmtMinutes(h.minutes)}</span>}
                    </p>
                  </div>
                  <TrendIcon trend={h.trend} />
                  <span
                    className={`shrink-0 rounded-full ${rateTone} px-2.5 py-1 text-[11px] font-bold tabular-nums text-white shadow-sm`}
                    title="share of days completed"
                  >
                    {h.rate}%
                  </span>
                </div>
                {monthly ? (
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={`h-full rounded-full ${tintClass}`}
                      style={tintStyle}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(h.rate, h.doneCount ? 3 : 0)}%` }}
                      transition={{ duration: 0.7, delay: i * 0.04, ease: "easeOut" }}
                    />
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center gap-1">
                    {/* one cell per calendar day — days beyond the logged window are still-to-come */}
                    {(dates ?? h.days.map(() => "")).map((date, j) => {
                      const future = j >= h.days.length;
                      const d = h.days[j] ?? false;
                      return (
                        <span
                          key={j}
                          title={`${date} — ${future ? "upcoming" : d ? "done" : "missed"}`}
                          style={!future && d ? tintStyle : undefined}
                          className={`grid h-6 flex-1 place-items-center rounded-md text-[9px] font-bold tabular-nums ${
                            future
                              ? "border border-dashed border-border/70 text-muted-foreground/40"
                              : d
                                ? `${tintClass} text-white shadow-sm`
                                : "bg-muted text-muted-foreground/60"
                          }`}
                        >
                          {date ? Number(date.slice(8, 10)) : ""}
                        </span>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrendIcon({ trend }: { trend: HabitInsight["trend"] }) {
  if (trend === "up") return <TrendingUp className="size-3.5 shrink-0 text-[var(--emerald)]" />;
  if (trend === "down") return <TrendingDown className="size-3.5 shrink-0 text-[var(--coral)]" />;
  return <Minus className="size-3.5 shrink-0 text-muted-foreground" />;
}

/* Horizontal bars — time spent per habit (h/m). */
export function TimeByHabit({
  items,
  totalMinutes,
}: {
  items: { name: string; minutes: number }[];
  totalMinutes: number;
}) {
  const grads = ["grad-violet", "grad-blue", "grad-teal", "grad-emerald", "grad-coral", "grad-indigo"];
  const max = Math.max(1, ...items.map((i) => i.minutes));
  return (
    <div className="card-surface rounded-3xl p-4 lg:p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold">Time spent per habit</h3>
        <span className="text-[11px] text-muted-foreground">{fmtMinutes(totalMinutes)} total</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No time logged yet. Tick a habit, then tap a time chip to track how long it took.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{item.name}</span>
                <span className="tabular-nums text-muted-foreground">{fmtMinutes(item.minutes)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full ${grads[i % grads.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.minutes / max) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Day-of-week pattern — avg habits done on each weekday, to spot which day leaks.
   Colour is by value: every day tied for best is green, tied-worst is red, middle is blue. */
export function DayOfWeekPattern({
  dow,
  best,
  worst,
}: {
  dow: DowPoint[];
  best: string | null;
  worst: string | null;
}) {
  const max = Math.max(1, ...dow.map((d) => d.avgDone));
  const active = dow.filter((d) => d.avgDone > 0).map((d) => d.avgDone);
  const hi = active.length ? Math.max(...active) : 0;
  const lo = active.length ? Math.min(...active) : 0;
  return (
    <div className="card-surface rounded-3xl p-4 lg:p-5">
      <h3 className="mb-1 font-display text-base font-semibold">Your week, by weekday</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        {best ? (
          <>
            Average habits done on each weekday — green = strongest, red = the leak day to fix.
            {hi === lo ? " All days are level right now." : (
              <>
                {" "}Strongest <span className="font-semibold text-foreground">{best}</span>
                {worst && worst !== best ? (
                  <>
                    , weakest <span className="font-semibold text-foreground">{worst}</span>
                  </>
                ) : null}
                .
              </>
            )}
          </>
        ) : (
          "Not enough data yet."
        )}
      </p>
      <div className="flex h-32 items-end justify-between gap-2">
        {dow.map((d, i) => {
          const h = (d.avgDone / max) * 100;
          const grad =
            d.avgDone === 0
              ? "bg-muted"
              : d.avgDone === hi
                ? "grad-emerald"
                : d.avgDone === lo && lo < hi
                  ? "grad-coral"
                  : "grad-blue";
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] tabular-nums text-muted-foreground">{d.rate}%</span>
              <div className="flex h-20 w-full items-end">
                <motion.div
                  className={`w-full rounded-lg ${grad}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(h, d.avgDone ? 8 : 3)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
                  style={{ opacity: d.avgDone ? 1 : 0.3 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Correlation stat cards — habits ↔ mood/energy. */
export function Correlations({ items }: { items: Correlation[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((c) => (
        <div key={c.label} className="card-tint tint-teal corner-cut p-4 lg:p-5">
          <div className="mb-1 flex items-center gap-2">
            {c.delta >= 0 ? (
              <TrendingUp className="size-4 text-[var(--emerald)]" />
            ) : (
              <TrendingDown className="size-4 text-[var(--coral)]" />
            )}
            <span className="font-display text-lg font-bold text-gradient">
              {c.delta >= 0 ? "+" : ""}
              {c.delta}
            </span>
            <span className="text-sm font-semibold">{c.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{c.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* Slipping habits — streak broke or the second week fell off. */
export function SlippingHabits({ habits }: { habits: HabitInsight[] }) {
  if (habits.length === 0) return null;
  return (
    <section className="card-elevated p-4 lg:p-5">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
        <TrendingDown className="size-4 text-[var(--coral)]" /> Slipping — fix these first
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        You were doing these, then fell off. Rebuild the streak before stacking anything new.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {habits.map((h) => (
          <div key={h.id} className="rounded-2xl bg-card/70 p-3">
            <p className="truncate text-sm font-medium">{h.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {h.doneCount}/{h.days.length} days · streak {h.streak}d · best {h.best}d
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Written report — plain-language analysis of the window: what moved, what stuck, what to fix. */
export function WrittenReport({
  days,
  perHabit,
  bestDow,
  worstDow,
  journaledDays,
  rangeLabel,
  mode = "week",
}: {
  days: DayPoint[];
  perHabit: HabitInsight[];
  bestDow: string | null;
  worstDow: string | null;
  journaledDays: number;
  rangeLabel: string;
  mode?: AnalyticsMode;
}) {
  const word = mode === "month" ? "month" : "week";
  const n = days.length;
  const half = Math.floor(n / 2);
  const w1 = days.slice(0, half);
  const w2 = days.slice(half);

  const avgOf = (arr: DayPoint[], key: "energy" | "selfRespect") => {
    const v = arr.map((d) => d[key]).filter((x): x is number => x != null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const doneAvg = (arr: DayPoint[]) =>
    arr.length ? Math.round((arr.reduce((s, d) => s + d.habitsDone, 0) / arr.length) * 10) / 10 : 0;

  const total = days.reduce((s, d) => s + d.habitsDone, 0);
  const activeDays = days.filter((d) => d.habitsDone > 0).length;
  const a1 = doneAvg(w1);
  const a2 = doneAvg(w2);
  const dir = a2 - a1;

  const locked = perHabit.filter((h) => h.rate >= 70);
  const improving = perHabit.filter((h) => h.trend === "up");
  const slipping = perHabit.filter((h) => h.trend === "down" && h.rate < 70);
  const stuck = perHabit.filter((h) => h.trend === "flat" && h.rate < 40 && h.doneCount > 0);
  const untouched = perHabit.filter((h) => h.doneCount === 0);

  const e1 = avgOf(w1, "energy");
  const e2 = avgOf(w2, "energy");
  const s1 = avgOf(w1, "selfRespect");
  const s2 = avgOf(w2, "selfRespect");

  const names = (hs: HabitInsight[]) => hs.slice(0, 4).map((h) => h.name).join(", ");
  const DAY_FULL: Record<string, string> = {
    Sun: "Sundays", Mon: "Mondays", Tue: "Tuesdays", Wed: "Wednesdays",
    Thu: "Thursdays", Fri: "Fridays", Sat: "Saturdays",
  };
  const dayName = (d: string) => DAY_FULL[d] ?? `${d}s`;

  const changed: string[] = [];
  if (e1 != null && e2 != null && Math.abs(e2 - e1) >= 0.3)
    changed.push(`Energy moved ${e1} → ${e2}/10 across the window.`);
  if (s1 != null && s2 != null && Math.abs(s2 - s1) >= 0.3)
    changed.push(`Self-respect moved ${s1} → ${s2}/10.`);
  if (improving.length) changed.push(`${names(improving)} picked up in the back half — keep feeding ${improving.length > 1 ? "them" : "it"}.`);

  const fixes: string[] = [];
  if (slipping.length) fixes.push(`Rebuild ${slipping[0].name} first — it was working, then fell off. One streak at a time.`);
  if (worstDow && worstDow !== bestDow) fixes.push(`${dayName(worstDow)} are the leak — pre-plan them the night before.`);
  if (journaledDays < Math.ceil(n / 2)) fixes.push(`Only ${journaledDays}/${n} days journaled — the scores are only as honest as the log.`);
  if (untouched.length) fixes.push(`${names(untouched)} never got a single tick — shrink ${untouched.length > 1 ? "them" : "it"} or park ${untouched.length > 1 ? "them" : "it"} in the backlog.`);
  if (!fixes.length) fixes.push("Nothing bleeding. Keep the chain alive and add nothing new until the current stack holds.");

  const blocks: { icon: React.ReactNode; grad: string; title: string; body: string }[] = [
    {
      icon: <ScrollText className="size-4" />,
      grad: "grad-blue",
      title: `How the ${word} went`,
      body: `${total} habit completions across ${activeDays} of ${n} days. Back half averaged ${a2}/day vs ${a1}/day in the front — ${
        dir > 0.5 ? "momentum is building" : dir < -0.5 ? "you lost steam late" : "you held steady"
      }.${bestDow ? ` You show up strongest on ${dayName(bestDow)}.` : ""}`,
    },
    {
      icon: <Shuffle className="size-4" />,
      grad: "grad-violet",
      title: "What changed",
      body: changed.length ? changed.join(" ") : `No real swings — the ${word} held its shape. Same inputs, same outputs.`,
    },
    {
      icon: <CheckCircle2 className="size-4" />,
      grad: "grad-emerald",
      title: "What became consistent",
      body: locked.length
        ? `${names(locked)} ran on 70%+ of days — locked in. That's identity now; protect ${locked.length > 1 ? "those slots" : "that slot"}.`
        : "Nothing crossed the 70% consistency line yet. Pick one habit and get it there before anything else.",
    },
    {
      icon: <AlertTriangle className="size-4" />,
      grad: "grad-coral",
      title: "What didn't stick",
      body:
        slipping.length || stuck.length
          ? `${slipping.length ? `${names(slipping)} fell off after a decent start. ` : ""}${
              stuck.length ? `${names(stuck)} never got past ${Math.max(...stuck.map((h) => h.rate))}% of days.` : ""
            }`.trim()
          : "Nothing actively slipping — clean sheet on the downside.",
    },
    {
      icon: <Lightbulb className="size-4" />,
      grad: "grad-teal",
      title: "What to improve next",
      body: fixes.join(" "),
    },
  ];

  return (
    <section className="card-elevated p-4 lg:p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-base font-semibold">The written report</h3>
        <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
      </div>
      <div className="space-y-3.5">
        {blocks.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="flex items-start gap-3"
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${b.grad} text-white shadow-sm`}>
              {b.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{b.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{b.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* Weekly plan vs. reality — how much of the plan landed, what was lost, how to recover it. */
export function WeekPlanReport({ plan }: { plan: WeekPlanInsight }) {
  if (plan.planned === 0) {
    return (
      <section className="card-tint tint-violet corner-cut p-4 lg:p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
          <Target className="size-4 text-primary" /> Weekly plan · {plan.label}
        </h3>
        <p className="text-sm text-muted-foreground">
          No day goals were set for this week, so there&apos;s nothing to score you against.
        </p>
        <Link
          href="/goals?view=weekly"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full grad-violet px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm"
        >
          <CalendarClock className="size-3.5" /> Plan the week
        </Link>
      </section>
    );
  }

  const tone = plan.pct >= 80 ? "grad-emerald" : plan.pct >= 50 ? "grad-coral" : "grad-rose";
  const verdictLine =
    plan.pct >= 80
      ? "Strong execution — the plan and the person matched. Raise the bar slightly next week."
      : plan.pct >= 50
        ? "Half-in. The plan was right, the follow-through leaked. Fewer, sharper day goals next week."
        : "The plan lost to the week. Don't write a braver plan — write a smaller one and win it.";

  const recoveryTemplates = [
    (l: { goal: string; weekday: string }) =>
      `Re-slot “${l.goal}” into Monday or Tuesday next week — lost goals recover fastest at the start of a week.`,
    (l: { goal: string; weekday: string }) =>
      `Shrink “${l.goal}” to a 15-minute version and anchor it right after a habit you already do daily.`,
    (l: { goal: string; weekday: string }) =>
      `“${l.goal}” died on ${l.weekday} — pre-decide its exact time slot the night before, not on the day.`,
  ];
  const recovery = [verdictLine, ...plan.losses.slice(0, 3).map((l, i) => recoveryTemplates[i % recoveryTemplates.length](l))];

  const Row = ({ item, kind }: { item: { weekday: string; goal: string }; kind: "win" | "loss" | "open" }) => (
    <li className="flex items-start gap-2.5 rounded-xl bg-card/70 px-3 py-2">
      {kind === "win" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--emerald)]" />
      ) : kind === "loss" ? (
        <XCircle className="mt-0.5 size-4 shrink-0 text-[var(--coral)]" />
      ) : (
        <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 text-[13px] leading-snug">
        <span className="mr-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
          {item.weekday}
        </span>
        {item.goal}
      </span>
    </li>
  );

  return (
    <section className="card-elevated p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-base font-semibold">
          <Target className="size-4 shrink-0 text-primary" /> Plan vs. reality
        </h3>
        <span className="shrink-0 text-[11px] text-muted-foreground">{plan.label}</span>
      </div>

      {/* score bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold">
            {plan.pct}
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {plan.done}/{plan.planned} day goals achieved
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={`h-full rounded-full ${tone}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(plan.pct, 3)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {plan.wins.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Achieved</p>
            <ul className="space-y-1.5">
              {plan.wins.map((w) => (
                <Row key={w.date} item={w} kind="win" />
              ))}
            </ul>
          </div>
        )}
        {(plan.losses.length > 0 || plan.upcoming.length > 0) && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {plan.losses.length ? "Lost" : "Still open"}
            </p>
            <ul className="space-y-1.5">
              {plan.losses.map((l) => (
                <Row key={l.date} item={l} kind="loss" />
              ))}
              {plan.upcoming.map((u) => (
                <Row key={u.date} item={u} kind="open" />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* recovery — what to do about the losses */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-muted/40 p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl grad-teal text-white shadow-sm">
          <Undo2 className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">How to recover the losses</p>
          <ul className="mt-1 space-y-1">
            {recovery.map((r, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-muted-foreground">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* Monthly goals scoreboard — goal progress, weekly execution trend, pace advice. */
export function MonthPlanReport({ plan }: { plan: MonthPlanInsight }) {
  if (plan.total === 0) {
    return (
      <section className="card-tint tint-violet corner-cut p-4 lg:p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
          <Target className="size-4 text-primary" /> Monthly goals · {plan.label}
        </h3>
        <p className="text-sm text-muted-foreground">
          No goals were set for {plan.label} — a month without targets can&apos;t be scored.
        </p>
        <Link
          href="/goals?view=monthly"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full grad-violet px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm"
        >
          <CalendarClock className="size-3.5" /> Set month goals
        </Link>
      </section>
    );
  }

  const tone = plan.pct >= 80 ? "grad-emerald" : plan.pct >= 50 ? "grad-coral" : "grad-rose";
  const open = plan.openList.length;
  const pace =
    plan.daysLeft > 0
      ? open > 0
        ? `${open} goal${open === 1 ? "" : "s"} still open with ${plan.daysLeft} days left — that's one every ${Math.max(
            1,
            Math.floor(plan.daysLeft / open)
          )} days. Pick the smallest one and close it this week.`
        : `Everything closed with ${plan.daysLeft} days to spare — bank the momentum into next month's goals.`
      : open > 0
        ? `Month's over with ${open} goal${open === 1 ? "" : "s"} unfinished — carry the one that still matters forward, drop the rest deliberately.`
        : "Clean sweep. Every goal closed.";

  return (
    <section className="card-elevated p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-base font-semibold">
          <Target className="size-4 shrink-0 text-primary" /> Month goals scoreboard
        </h3>
        <span className="shrink-0 text-[11px] text-muted-foreground">{plan.label}</span>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-display text-2xl font-bold">
            {plan.pct}
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {plan.done}/{plan.total} goals done
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={`h-full rounded-full ${tone}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(plan.pct, 3)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {plan.doneList.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closed</p>
            <ul className="space-y-1.5">
              {plan.doneList.map((g) => (
                <li key={g} className="flex items-start gap-2.5 rounded-xl bg-card/70 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--emerald)]" />
                  <span className="min-w-0 text-[13px] leading-snug">{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan.openList.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still open</p>
            <ul className="space-y-1.5">
              {plan.openList.map((g) => (
                <li key={g} className="flex items-start gap-2.5 rounded-xl bg-card/70 px-3 py-2">
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 text-[13px] leading-snug">{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* weekly execution inside the month */}
      {plan.weeklyTrend.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Week-by-week execution
          </p>
          <div className="space-y-2">
            {plan.weeklyTrend.map((w, i) => (
              <div key={w.period} className="flex items-center gap-2.5">
                <span className="w-24 shrink-0 text-[11px] tabular-nums text-muted-foreground">{w.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={`h-full rounded-full ${w.pct >= 80 ? "grad-emerald" : w.pct >= 50 ? "grad-coral" : "grad-rose"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(w.pct, 2)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums">{w.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-muted/40 p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl grad-teal text-white shadow-sm">
          <Lightbulb className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Pace check</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{pace}</p>
        </div>
      </div>
    </section>
  );
}

/* Horizontal bars — favorite habits */
export function FavoriteBars({ items }: { items: { name: string; count: number }[] }) {
  const grads = ["grad-violet", "grad-blue", "grad-teal", "grad-emerald", "grad-coral"];
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="card-surface rounded-3xl p-4 lg:p-5">
      <h3 className="mb-4 font-display text-base font-semibold">Most consistent habits</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completions logged yet in the last 14 days.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.count}×</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full ${grads[i % grads.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / max) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
