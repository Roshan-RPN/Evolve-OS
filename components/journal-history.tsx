"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sunrise,
  Sun,
  MoonStar,
  ChevronDown,
  Sparkles,
  Target,
  ListChecks,
  CalendarClock,
  Heart,
  Gauge,
  Rocket,
  BatteryLow,
  BookOpen,
} from "lucide-react";
import { CoachAvatar } from "@/components/coach-avatar";
import { relativeDayLabel } from "@/lib/date";
import { EVENING_DIMENSIONS } from "@/lib/evening-scorecard";
import type { JournalDay } from "@/lib/actions/journal-history";

const STATUS_LABEL: Record<string, string> = {
  done: "Done",
  moving: "Moving",
  stalled: "Stalled",
  untouched: "Not yet",
};
const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald",
  moving: "bg-primary",
  stalled: "bg-[var(--bronze)]",
  untouched: "bg-[var(--coral)]",
};

function hasText(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function cleanList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => hasText(x)).map((x) => (x as string).trim()) : [];
}

function morningPresent(day: JournalDay) {
  const m = day.morning;
  const p = day.plan;
  return Boolean(
    (m && (hasText(m.affirmations) || hasText(m.emotion) || cleanList(m.gratitudes).length)) ||
      (p && (cleanList(p.top_priorities).length || cleanList(p.todo).length || (p.schedule?.length ?? 0)))
  );
}

/** A labelled block of free text — skipped entirely when empty. */
function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}

/** Leo's read for a section — his voice, set apart from the user's own words. */
function LeoRead({ text }: { text?: string | null }) {
  if (!hasText(text)) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary/[0.04] p-3">
      <CoachAvatar mood="calm" size={28} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">Leo</p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
      </div>
    </div>
  );
}

function SectionHead({
  icon: Icon,
  title,
  grad,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  grad: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold">
      <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${grad} text-white`}>
        <Icon className="size-3.5" />
      </span>
      {title}
    </p>
  );
}

function MorningBlock({ day }: { day: JournalDay }) {
  const m = day.morning ?? {};
  const p = day.plan ?? {};
  const priorities = cleanList(p.top_priorities);
  const todo = cleanList(p.todo);
  const schedule = (p.schedule ?? []).filter((s) => hasText(s?.block) || hasText(s?.time));
  const gratitudes = cleanList(m.gratitudes);

  return (
    <div className="space-y-3">
      <SectionHead icon={Sunrise} title="Morning" grad="grad-coral" />
      {priorities.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="size-3.5" /> Top priorities
          </p>
          <ul className="mt-1 space-y-0.5">
            {priorities.map((t, i) => (
              <li key={i} className="text-sm text-foreground/90">• {t}</li>
            ))}
          </ul>
        </div>
      )}
      {todo.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="size-3.5" /> To-do
          </p>
          <ul className="mt-1 space-y-0.5">
            {todo.map((t, i) => (
              <li key={i} className="text-sm text-foreground/90">• {t}</li>
            ))}
          </ul>
        </div>
      )}
      {schedule.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="size-3.5" /> Schedule
          </p>
          <ul className="mt-1 space-y-0.5">
            {schedule.map((s, i) => (
              <li key={i} className="text-sm text-foreground/90">
                {hasText(s.time) && <span className="font-medium tabular-nums text-primary">{s.time}</span>}{" "}
                {s.block}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field
        label="Affirmation"
        value={hasText(m.affirmations) ? m.affirmations : undefined}
      />
      {typeof m.affirmation_truth_score === "number" && (
        <Field label="Felt true" value={`${m.affirmation_truth_score}/10`} />
      )}
      {(hasText(m.emotion) || typeof m.energy === "number") && (
        <div className="flex flex-wrap gap-2">
          {hasText(m.emotion) && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Mood: {m.emotion}</span>
          )}
          {typeof m.energy === "number" && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Energy: {m.energy}/10</span>
          )}
        </div>
      )}
      {gratitudes.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Heart className="size-3.5" /> Gratitudes
          </p>
          <ul className="mt-1 space-y-0.5">
            {gratitudes.map((g, i) => (
              <li key={i} className="text-sm text-foreground/90">• {g}</li>
            ))}
          </ul>
        </div>
      )}
      <Field label="Felt most" value={hasText(m.gratitude_felt_most) ? m.gratitude_felt_most : undefined} />
      <LeoRead text={day.plan?.ai_critique} />
      <LeoRead text={day.ai_morning_story} />
    </div>
  );
}

function AfternoonBlock({ a }: { a: NonNullable<JournalDay["afternoon"]> }) {
  const progress = (a.priority_progress ?? []).filter((p) => hasText(p?.priority));
  return (
    <div className="space-y-3">
      <SectionHead icon={Sun} title="Afternoon reset" grad="grad-amber" />
      {(typeof a.on_track_score === "number" || hasText(a.energy)) && (
        <div className="flex flex-wrap gap-2">
          {typeof a.on_track_score === "number" && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">On track: {a.on_track_score}/10</span>
          )}
          {hasText(a.energy) && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Energy: {a.energy}</span>
          )}
        </div>
      )}
      {progress.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where they stood</p>
          <ul className="mt-1 space-y-1">
            {progress.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground/90">
                <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[p.status] ?? "bg-muted-foreground"}`} />
                <span className="min-w-0 flex-1">{p.priority}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[p.status] ?? p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Field label="What drifted" value={hasText(a.drift) ? a.drift : undefined} />
      <Field label="Honest line" value={hasText(a.honest_line) ? a.honest_line : undefined} />
      <Field label="Refocus" value={hasText(a.refocus) ? a.refocus : undefined} />
      <LeoRead text={a.nudge} />
    </div>
  );
}

function EveningBlock({ e }: { e: NonNullable<JournalDay["evening"]> }) {
  const scorecard = e.scorecard ?? {};
  const hasScores = EVENING_DIMENSIONS.some((d) => typeof scorecard[d.key] === "number");
  const gratitudes = cleanList(e.gratitudes);
  return (
    <div className="space-y-3">
      <SectionHead icon={MoonStar} title="Evening" grad="grad-dusk" />
      <Field label="Story-worthy moment" value={hasText(e.story_moment) ? e.story_moment : undefined} />
      <Field label="Win / proof" value={hasText(e.win) ? e.win : undefined} />
      <Field label="Mistake & lesson" value={hasText(e.mistakes) ? e.mistakes : undefined} />
      <Field label="One fix for tomorrow" value={hasText(e.better_tomorrow) ? e.better_tomorrow : undefined} />

      {hasScores && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Gauge className="size-3.5" /> Scorecard
            {typeof e.scorecard_average === "number" && (
              <span className="ml-1 text-primary">avg {e.scorecard_average}/10</span>
            )}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {EVENING_DIMENSIONS.map((d) =>
              typeof scorecard[d.key] === "number" ? (
                <div key={d.key} className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1">
                  <span className="text-xs">{d.label}</span>
                  <span className="text-xs font-bold tabular-nums">{scorecard[d.key]}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      <Field label="The plain truth" value={hasText(e.honest_readout) ? e.honest_readout : undefined} />
      {hasText(e.energy_leak) && (
        <div className="flex items-start gap-2">
          <BatteryLow className="mt-0.5 size-4 shrink-0 text-[var(--coral)]" />
          <Field label="Energy leak" value={e.energy_leak} />
        </div>
      )}
      {typeof e.self_respect_score === "number" && (
        <Field label="Self-respect" value={`${e.self_respect_score}/10`} />
      )}
      {hasText(e.first_move) && (
        <div className="flex items-start gap-2">
          <Rocket className="mt-0.5 size-4 shrink-0 text-primary" />
          <Field label="Tomorrow's first move" value={e.first_move} />
        </div>
      )}
      <Field label="How it felt" value={hasText(e.vision_felt_note) ? e.vision_felt_note : undefined} />

      {gratitudes.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Heart className="size-3.5" /> Gratitudes
          </p>
          <ul className="mt-1 space-y-0.5">
            {gratitudes.map((g, i) => (
              <li key={i} className="text-sm text-foreground/90">• {g}</li>
            ))}
          </ul>
        </div>
      )}
      <Field label="Felt most" value={hasText(e.gratitude_felt_most) ? e.gratitude_felt_most : undefined} />
      {/* Leo's realization + manifestation are rendered by the parent (they live
          outside the evening json), so nothing more here. */}
    </div>
  );
}

function DayCard({ day, today }: { day: JournalDay; today: string }) {
  const [open, setOpen] = useState(false);
  const hasMorning = morningPresent(day);
  const hasAfternoon = Boolean(day.afternoon);
  const hasEvening = Boolean(day.evening);

  const pills: { on: boolean; label: string; grad: string }[] = [
    { on: hasMorning, label: "Morning", grad: "grad-coral" },
    { on: hasAfternoon, label: "Afternoon", grad: "grad-amber" },
    { on: hasEvening, label: "Evening", grad: "grad-dusk" },
  ];

  return (
    <div className="card-elevated overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold">{relativeDayLabel(day.date, today)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pills.map((p) => (
              <span
                key={p.label}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  p.on ? `${p.grad} text-white` : "bg-muted text-muted-foreground/60"
                }`}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-border/50 p-4">
              {hasMorning && <MorningBlock day={day} />}
              {hasAfternoon && <AfternoonBlock a={day.afternoon!} />}
              {hasEvening && (
                <div className="space-y-3">
                  <EveningBlock e={day.evening!} />
                  <LeoReadOutside realization={day.ai_realization} manifestation={day.evening!.manifestation} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Evening's Leo reads live outside the evening json (realization on the row,
    manifestation inside it) — render them together after the entry body. */
function LeoReadOutside({
  realization,
  manifestation,
}: {
  realization?: string | null;
  manifestation?: string | null;
}) {
  return (
    <>
      <LeoRead text={realization} />
      {hasText(manifestation) && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-border/50 bg-muted/30 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Visualize tomorrow&apos;s first move
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{manifestation}</p>
          </div>
        </div>
      )}
    </>
  );
}

export function JournalHistory({ days, today }: { days: JournalDay[]; today: string }) {
  if (days.length === 0) {
    return (
      <div className="card-elevated flex flex-col items-center gap-3 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl grad-dusk text-white shadow-md">
          <BookOpen className="size-6" />
        </span>
        <p className="font-display text-lg font-semibold">No entries yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Once you finish a morning, afternoon, or evening journal, it&apos;ll show up here to read back.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {days.map((day) => (
        <DayCard key={day.date} day={day} today={today} />
      ))}
    </div>
  );
}
