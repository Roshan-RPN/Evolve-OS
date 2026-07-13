"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, CalendarClock, AlertTriangle, ChevronLeft, ChevronRight, Lock, Sparkles, Loader2, Wand2, Check, Sunrise } from "lucide-react";
import { saveSchedule, planDayWithLeo, toggleScheduleDone, type ScheduleItem } from "@/lib/actions/schedule";
import { critiqueDraftPlan } from "@/lib/actions/morning";
import { LeoFollowup } from "@/components/leo-followup";
import { TimeWheel } from "@/components/time-wheel";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { shiftISO } from "@/lib/date";

const MAX_BLOCKS = 14; // a day only holds so much — hard cap to stop over-stacking

// One-tap starter day — shows what a planned day looks like; every block is editable/removable.
const SAMPLE_DAY: ScheduleItem[] = [
  { time: "06:30", block: "Wake up + hydrate", priority: 3 },
  { time: "07:00", block: "Workout — move for 30 min", priority: 1 },
  { time: "09:00", block: "Deep work — most important task", priority: 1 },
  { time: "13:00", block: "Lunch + short walk", priority: 3 },
  { time: "16:00", block: "Skill hour — learn or build", priority: 2 },
  { time: "21:30", block: "Evening reflection", priority: 2 },
];

const PRIORITIES = [
  { p: 1, label: "P1", desc: "Critical" },
  { p: 2, label: "P2", desc: "Important" },
  { p: 3, label: "P3", desc: "Normal" },
  { p: 4, label: "P4", desc: "Someday" },
] as const;

function prioLabel(p?: number) {
  return PRIORITIES.find((x) => x.p === (p ?? 2))?.desc ?? "Normal";
}

function to24h(t: string) {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

export function ScheduleBoard({
  initial,
  date,
  today,
  dateLabel,
  readOnly = false,
}: {
  initial: ScheduleItem[];
  date: string;
  today: string;
  dateLabel: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<ScheduleItem[]>(initial);
  const [time, setTime] = useState("09:00");
  const [block, setBlock] = useState("");
  const [priority, setPriority] = useState(2);
  const [warning, setWarning] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false); // mobile only — desktop always shows it
  const [leoRead, setLeoRead] = useState<string | null>(null);
  const [leoAsking, setLeoAsking] = useState(false);
  const [leoErr, setLeoErr] = useState(false);
  const [leoPlanning, setLeoPlanning] = useState(false);
  const [leoPlanErr, setLeoPlanErr] = useState(false);
  const [, startTransition] = useTransition();

  // Leo builds a realistic day from the weekly plan + monthly goals + profile,
  // then merges its blocks into whatever's already here (no duplicates).
  async function planWithLeo() {
    setLeoPlanning(true);
    setLeoPlanErr(false);
    try {
      const blocks = await planDayWithLeo(date);
      if (!blocks.length) {
        setLeoPlanErr(true);
        return;
      }
      const have = new Set(items.map((i) => i.block.trim().toLowerCase()));
      const merged = [...items, ...blocks.filter((b) => !have.has(b.block.trim().toLowerCase()))];
      persist(merged.slice(0, MAX_BLOCKS));
      setWarning(null);
    } catch {
      setLeoPlanErr(true);
    } finally {
      setLeoPlanning(false);
    }
  }

  async function askLeo() {
    setLeoAsking(true);
    setLeoErr(false);
    try {
      setLeoRead(await critiqueDraftPlan({ top_priorities: [], todo: [], schedule: items }));
    } catch {
      setLeoErr(true);
    } finally {
      setLeoAsking(false);
    }
  }

  const atCap = items.length >= MAX_BLOCKS;
  const p1Count = items.filter((i) => (i.priority ?? 2) === 1).length;

  function persist(next: ScheduleItem[]) {
    const sorted = [...next].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    setItems(sorted);
    startTransition(() => {
      saveSchedule(date, sorted);
    });
  }

  function add() {
    const name = block.trim();
    if (!name) return;

    // Guardrails — flag likely-unnecessary or over-stacked entries
    if (atCap) {
      setWarning(`Day's full at ${MAX_BLOCKS} blocks. Cut something before adding more.`);
      return;
    }
    const dup = items.find((i) => i.block.trim().toLowerCase() === name.toLowerCase());
    if (dup) {
      setWarning(`"${name}" is already on today. Skip the duplicate?`);
    } else if (priority === 1 && p1Count >= 3) {
      setWarning("That's your 4th P1. If everything's critical, nothing is — sure?");
    } else {
      setWarning(null);
    }

    persist([...items, { time, block: name, priority }]);
    setBlock("");
  }

  function remove(idx: number) {
    persist(items.filter((_, i) => i !== idx));
    setWarning(null);
  }

  // Strike a block done (or clear it). Optimistic locally, synced server-side —
  // which also mirrors onto a matching check-in so home agrees.
  function toggleDone(idx: number) {
    const target = items[idx];
    const done = !target.done;
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, done } : it)));
    startTransition(() => {
      toggleScheduleDone(date, target.block, done);
    });
  }

  const prevDate = shiftISO(date, -1);
  const nextDate = shiftISO(date, 1);
  const canGoNext = nextDate <= today;
  // Short name for the day being viewed — sits between the arrows.
  const chipLabel =
    dateLabel === "Today" || dateLabel === "Yesterday"
      ? dateLabel
      : new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <Reveal className="space-y-3.5 lg:space-y-6" stagger={0.06}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center corner-cut grad-blue text-white shadow-md transition-transform hover:scale-105 lg:size-11">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold lg:text-2xl">Schedule</h1>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {dateLabel}
              {readOnly && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
                  <Lock className="size-3" /> Past · read-only
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Day navigation — the chip between the arrows always names the day you're LOOKING AT */}
        <div className="ml-auto flex items-center gap-1">
          {readOnly && (
            <Link
              href="/schedule"
              className="mr-1 whitespace-nowrap rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              Back to today
            </Link>
          )}
          <Link
            href={`/schedule?date=${prevDate}`}
            aria-label="Previous day"
            className="grid size-9 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-[18px]" />
          </Link>
          <span
            className={`min-w-20 rounded-xl px-3 py-1.5 text-center text-xs font-semibold ${
              dateLabel === "Today"
                ? "grad-blue text-white shadow-md ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                : "border border-border/60 bg-card"
            }`}
          >
            {chipLabel}
          </span>
          {canGoNext ? (
            <Link
              href={`/schedule?date=${nextDate}`}
              aria-label="Next day"
              className="grid size-9 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronRight className="size-[18px]" />
            </Link>
          ) : (
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-xl border border-border/40 bg-card/50 text-muted-foreground/40"
            >
              <ChevronRight className="size-[18px]" />
            </span>
          )}
        </div>
      </div>

      {/* Day summary — quick read of how loaded the day is, same tile language as home/analytics */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <div className="tile grad-blue corner-cut p-3 lg:p-4">
            <div className="relative z-10 flex items-center gap-2.5 lg:block">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] lg:size-9">
                <CalendarClock className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold leading-none tracking-tight drop-shadow-sm lg:mt-2 lg:text-2xl">
                  <CountUp value={items.length} />
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-white/90 lg:mt-1 lg:text-xs">
                  block{items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          <div className="tile grad-coral corner-alt p-3 lg:p-4">
            <div className="relative z-10 flex items-center gap-2.5 lg:block">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] lg:size-9">
                <AlertTriangle className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold leading-none tracking-tight drop-shadow-sm lg:mt-2 lg:text-2xl">
                  <CountUp value={p1Count} />
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-white/90 lg:mt-1 lg:text-xs">critical</p>
              </div>
            </div>
          </div>
          <div className="tile grad-teal corner-cut p-3 lg:p-4">
            <div className="relative z-10 flex items-center gap-2.5 lg:block">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] lg:size-9">
                <Sunrise className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold leading-none tracking-tight drop-shadow-sm lg:mt-2 lg:text-2xl">
                  {to24h(items[0].time)}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-white/90 lg:mt-1 lg:text-xs">first block</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add block — spin the time, name it, set priority */}
      {!readOnly && !composerOpen && (
        <button
          onClick={() => setComposerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition-colors active:bg-primary/10 lg:hidden"
        >
          <Plus className="size-4" /> Add a time block
        </button>
      )}
      {!readOnly && (
      <div className={`card-tint tint-blue corner-cut space-y-3.5 p-4 sm:p-5 ${composerOpen ? "" : "hidden lg:block"}`}>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarClock className="size-4 text-primary" /> Build the day
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* rotating time wheel */}
          <div className="shrink-0">
            <p className="mb-1.5 pl-1 text-xs font-medium text-muted-foreground">Spin the time</p>
            <TimeWheel value={time} onChange={setTime} />
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <input
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="What's the block? e.g. Deep work — outreach"
              className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm outline-none ring-primary/40 focus:ring-2"
            />

            {/* priority picker — color = importance */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Priority</span>
              {PRIORITIES.map((x) => (
                <button
                  key={x.p}
                  onClick={() => setPriority(x.p)}
                  className={`prio-${x.p} inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    priority === x.p ? "prio-chip scale-105" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="prio-dot size-2 rounded-full" />
                  {x.label} · {x.desc}
                </button>
              ))}
            </div>

            {warning && (
              <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="size-3.5 shrink-0 text-[var(--bronze)]" />
                {warning}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{items.length}/{MAX_BLOCKS} blocks</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setComposerOpen(false)}
                  className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted lg:hidden"
                >
                  Done
                </button>
                <button
                  onClick={add}
                  disabled={atCap}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl grad-blue px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <Plus className="size-4" /> Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Plan with Leo — grounded in this week's plan, the month's goals + your profile */}
      {!readOnly && (
        <div className="space-y-1.5">
          <button
            onClick={planWithLeo}
            disabled={leoPlanning || atCap}
            className="group flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-card/70 p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 lg:gap-4 lg:p-4"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl grad-blue text-white shadow-md transition-transform group-hover:scale-105">
              {leoPlanning ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {leoPlanning
                  ? "Leo's building your day…"
                  : items.length
                    ? "Fill the gaps with Leo"
                    : "Plan my day with Leo"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Built from this week&apos;s plan, the month&apos;s goals and your profile — every block stays editable.
              </span>
            </span>
            <Sparkles className="size-4 shrink-0 text-primary" />
          </button>
          {leoPlanErr && (
            <p className="text-[11px] text-muted-foreground">Leo couldn&apos;t build it right now. Try again, or add blocks by hand.</p>
          )}
        </div>
      )}

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="card-surface corner-cut flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid size-12 place-items-center corner-cut grad-blue text-white shadow-md">
            <CalendarClock className="size-6" />
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            {readOnly
              ? "Nothing was scheduled on this day."
              : "Your day is a blank canvas. Add your first time block above."}
          </p>
          {!readOnly && (
            <button
              onClick={() => persist(SAMPLE_DAY)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:-translate-y-0.5 hover:bg-primary/15"
            >
              <Sparkles className="size-3.5" /> Start with a sample day
            </button>
          )}
        </div>
      ) : (
        <div className="relative space-y-3 pl-4">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
          <AnimatePresence initial={false}>
            {items.map((item, idx) => (
              <motion.div
                key={`${item.time}-${item.block}-${idx}`}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`prio-${item.priority ?? 2} relative`}
              >
                <span className="prio-dot absolute -left-4 top-5 size-3.5 rounded-full ring-4 ring-background" />
                <div className={`prio-band card-elevated group flex items-center gap-3 rounded-2xl p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:gap-4 lg:p-3.5 ${item.done ? "opacity-70" : ""}`}>
                  {!readOnly && (
                    <button
                      onClick={() => toggleDone(idx)}
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
                        item.done
                          ? "border-emerald bg-emerald text-white"
                          : "border-muted-foreground/40 text-transparent hover:border-primary"
                      }`}
                      aria-label={item.done ? "Mark not done" : "Mark done"}
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                  <span className="prio-chip grid min-w-16 place-items-center corner-cut px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums lg:min-w-20 lg:px-3 lg:py-2">
                    {to24h(item.time)}
                  </span>
                  <span className={`flex-1 truncate text-sm font-medium ${item.done ? "text-muted-foreground line-through" : ""}`}>{item.block}</span>
                  <span className="prio-text hidden shrink-0 text-[11px] font-semibold sm:block">
                    {prioLabel(item.priority)}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => remove(idx)}
                      className="text-muted-foreground opacity-100 transition-opacity hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Ask Leo — blunt read of the day's plan */}
      {!readOnly && items.length > 0 && (
        <section className="card-elevated space-y-2.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Sparkles className="size-4 text-primary" /> Ask Leo
            </h2>
            <button
              onClick={askLeo}
              disabled={leoAsking}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
            >
              {leoAsking ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {leoAsking ? "Reading…" : leoRead ? "Ask again" : "Is this day realistic?"}
            </button>
          </div>
          {leoErr && <p className="text-[11px] text-muted-foreground">Leo couldn&apos;t reach through. Try again.</p>}
          {leoRead && (
            <p className="whitespace-pre-line rounded-2xl bg-card/70 p-3 text-sm leading-relaxed text-foreground/90">
              {leoRead}
            </p>
          )}
          {leoRead && <LeoFollowup topic="today's schedule and whether it's realistic" seed={leoRead} />}
        </section>
      )}
    </Reveal>
  );
}
