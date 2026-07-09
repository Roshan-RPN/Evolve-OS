"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addHabit,
  toggleHabitToday,
  logHabitMinutes,
  suggestHabitsForVision,
  updateHabit,
  archiveHabit,
  type Habit,
  type TimeOfDay,
} from "@/lib/actions/habits";
import type { SuggestedHabit } from "@/lib/ai/coach";
import { Flame, Plus, Sparkles, Loader2, Sunrise, Sun, Moon, Clock, Lock, Link2, Check, Archive, Hourglass, Info, Pencil, Trash2, X } from "lucide-react";
import { HABIT_ICONS, iconFor } from "@/lib/habit-icons";
import { HABIT_COLORS, habitColorValue } from "@/lib/habit-colors";

type Props = {
  habits: Habit[];
  backlog: Habit[];
  completedTodayIds: string[];
  minutesToday: Record<string, number>;
  heatmap: Record<string, boolean[]>;
};

const MINUTE_CHIPS = [15, 30, 45, 60, 90];

function fmtMinutes(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

const STACKS: { key: TimeOfDay; label: string; icon: typeof Sun; grad: string }[] = [
  { key: "morning", label: "Morning", icon: Sunrise, grad: "grad-coral" },
  { key: "afternoon", label: "Afternoon", icon: Sun, grad: "grad-teal" },
  { key: "evening", label: "Evening", icon: Moon, grad: "grad-dusk" },
  { key: "anytime", label: "Anytime", icon: Clock, grad: "grad-blue" },
];

export function HabitTracker({ habits, backlog, completedTodayIds, minutesToday, heatmap }: Props) {
  const [completed, setCompleted] = useState(new Set(completedTodayIds));
  const [minutes, setMinutes] = useState<Record<string, number>>(minutesToday);
  const [items, setItems] = useState<Habit[]>(habits);
  const [name, setName] = useState("");
  const [anchor, setAnchor] = useState("");
  const [tod, setTod] = useState<TimeOfDay>("morning");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedHabit[]>([]);
  const [suggestState, setSuggestState] = useState<"idle" | "loading" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const tempSeq = useRef(0);

  function toggle(id: string, checked: boolean) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    if (!checked) {
      setMinutes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    startTransition(() => toggleHabitToday(id, checked));
  }

  function setHabitMinutes(id: string, value: number | null) {
    setMinutes((prev) => {
      const next = { ...prev };
      if (value == null) delete next[id];
      else next[id] = value;
      return next;
    });
    startTransition(() => {
      void logHabitMinutes(id, value);
    });
  }

  function editHabit(id: string, patch: { name: string; anchor: string; time_of_day: TimeOfDay }) {
    setItems((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, name: patch.name, anchor: patch.anchor.trim() || null, time_of_day: patch.time_of_day } : h
      )
    );
    startTransition(() => updateHabit(id, patch));
  }

  function removeHabit(id: string) {
    setItems((prev) => prev.filter((h) => h.id !== id));
    startTransition(() => archiveHabit(id));
  }

  function optimisticAdd(h: { name: string; anchor: string; time_of_day: TimeOfDay; origin: "self" | "leo"; icon?: string | null; color?: string | null }) {
    const temp: Habit = {
      id: `temp-${(tempSeq.current += 1)}`,
      name: h.name,
      type: "identity",
      status: "active",
      streak: 0,
      best_streak: 0,
      sort_order: 999,
      anchor: h.anchor || null,
      time_of_day: h.time_of_day,
      origin: h.origin,
      target_minutes: null,
      icon: h.icon ?? null,
      color: h.color ?? null,
    };
    setItems((prev) => [...prev, temp]);
    startTransition(() =>
      addHabit(h.name, { type: "identity", anchor: h.anchor, time_of_day: h.time_of_day, origin: h.origin, icon: h.icon ?? null, color: h.color ?? null })
    );
  }

  function addOwn() {
    if (!name.trim()) return;
    optimisticAdd({ name: name.trim(), anchor: anchor.trim(), time_of_day: tod, origin: "self", icon, color });
    setName("");
    setAnchor("");
    setIcon(null);
    setColor(null);
  }

  function suggest() {
    setSuggestState("loading");
    startTransition(async () => {
      try {
        const res = await suggestHabitsForVision();
        setSuggestions(res);
        setSuggestState(res.length ? "idle" : "error");
      } catch {
        setSuggestState("error");
      }
    });
  }

  function acceptSuggestion(s: SuggestedHabit) {
    optimisticAdd({
      name: s.habit,
      anchor: s.anchor,
      time_of_day: (["morning", "afternoon", "evening", "anytime"].includes(s.time_of_day)
        ? s.time_of_day
        : "anytime") as TimeOfDay,
      origin: "leo",
    });
    setSuggestions((prev) => prev.filter((x) => x !== s));
  }

  const totalToday = items.length;
  const doneToday = items.filter((h) => completed.has(h.id)).length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 lg:space-y-6 lg:p-6">
      <header className="card-tint tint-blue corner-cut relative overflow-hidden p-4 lg:p-6">
        <div className="relative flex items-center gap-3 lg:gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl grad-blue text-white shadow-md lg:size-12">
            <Flame className="size-5 lg:size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold lg:text-2xl">Habit Stack</h1>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Anchor each habit to something you already do — <span className="italic">after X, I will Y</span>.
              Stack them by time of day and run the whole chain.
            </p>
            <p className="text-xs text-muted-foreground lg:hidden">
              After X, I will Y — run the whole chain.
            </p>
          </div>
        </div>
        {totalToday > 0 && (
          <div className="relative mt-3.5 lg:mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Today&apos;s stack</span>
              <span>
                {doneToday}/{totalToday} done
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full grad-blue transition-all"
                style={{ width: `${totalToday ? (doneToday / totalToday) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Stacks by time of day — every stack shows, each with its own scoreboard */}
      {STACKS.map((stack) => {
        const stackHabits = items.filter((h) => (h.time_of_day ?? "anytime") === stack.key);
        const Icon = stack.icon;
        if (stackHabits.length === 0) {
          // Hide empty stacks only when there are no habits at all (empty-state card covers it)
          if (items.length === 0) return null;
          return (
            <section key={stack.key} className="rounded-2xl border border-dashed border-border/60 px-3.5 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className={`grid size-7 place-items-center rounded-lg ${stack.grad} text-white opacity-60`}>
                  <Icon className="size-4" />
                </span>
                {stack.label} stack is empty — add one below.
              </p>
            </section>
          );
        }
        const done = stackHabits.filter((h) => completed.has(h.id)).length;
        // this-week (Sun→Sat, days elapsed) hit rate across the stack — its scoreboard
        const weekCells = stackHabits.flatMap((h) => thisWeekCells(heatmap[h.id]).filter((d) => d !== null));
        const weekPct = weekCells.length
          ? Math.round((weekCells.filter(Boolean).length / weekCells.length) * 100)
          : 0;
        const bestStreak = Math.max(0, ...stackHabits.map((h) => h.streak));
        return (
          <section key={stack.key} className="card-elevated space-y-2.5 p-3.5 lg:space-y-3 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${stack.grad} text-white`}>
                  <Icon className="size-4" />
                </span>
                <span className="truncate">{stack.label}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {stackHabits.length} habit{stackHabits.length === 1 ? "" : "s"}
                </span>
              </p>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {done}/{stackHabits.length} today
              </span>
            </div>
            {/* stack scoreboard: today's progress + 7-day rate + hottest streak */}
            <div className="flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${stack.grad} transition-all`}
                  style={{ width: `${stackHabits.length ? (done / stackHabits.length) * 100 : 0}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {weekPct}% this week
              </span>
              {bestStreak > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tabular-nums text-primary">
                  <Flame className="size-3" /> {bestStreak}d
                </span>
              )}
            </div>
            <div className="space-y-2 lg:space-y-3">
              {stackHabits.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  grad={stack.grad}
                  checked={completed.has(h.id)}
                  minutes={minutes[h.id] ?? null}
                  onToggle={toggle}
                  onSetMinutes={setHabitMinutes}
                  onEdit={editHabit}
                  onDelete={removeHabit}
                  dots={heatmap[h.id]}
                />
              ))}
            </div>
          </section>
        );
      })}

      {items.length === 0 && (
        <div className="card-surface rounded-3xl p-8 text-center text-sm text-muted-foreground">
          No habits stacked yet. Add your first below, or let Leo suggest some from your vision.
        </div>
      )}

      {/* Leo suggestions */}
      <section className="card-tint tint-blue corner-cut space-y-3 p-3.5 lg:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> Suggest from your vision
          </p>
          <Button size="sm" variant="outline" onClick={suggest} disabled={pending || suggestState === "loading"}>
            {suggestState === "loading" ? <Loader2 className="size-4 animate-spin" /> : "Ask Leo"}
          </Button>
        </div>
        {suggestState === "error" && (
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t get suggestions right now — add your own below and try Leo again later.
          </p>
        )}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => acceptSuggestion(s)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg grad-blue text-white">
                  <Plus className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{s.habit}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.time_of_day} · after {s.anchor}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Add your own */}
      <section className="card-elevated space-y-3 p-3.5 lg:p-5">
        <p className="text-sm font-semibold">Add your own</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The habit — e.g. read 5 pages" />
        <div className="flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            placeholder="After… (anchor, e.g. pouring my coffee)"
          />
        </div>
        {/* Icon picker — 60 icons, 3 swipeable rows. None chosen = auto-match from the name. */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Pick an icon <span className="text-muted-foreground/60">· optional, auto-matched from the name otherwise</span>
          </p>
          <div className="no-scrollbar grid grid-flow-col grid-rows-3 gap-1.5 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_94%,transparent)]">
            {HABIT_ICONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => setIcon(icon === key ? null : key)}
                className={`grid size-9 place-items-center rounded-xl border transition-all active:scale-90 ${
                  icon === key
                    ? "grad-blue border-transparent text-white shadow-md"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px]" />
              </button>
            ))}
          </div>
        </div>
        {/* Colour picker — the habit's accent. None chosen = the stack's colour. */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Pick a colour <span className="text-muted-foreground/60">· optional, uses the stack colour otherwise</span>
          </p>
          <div className="no-scrollbar grid grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_94%,transparent)]">
            {HABIT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.name}
                aria-label={c.name}
                onClick={() => setColor(color === c.key ? null : c.key)}
                style={{ backgroundColor: c.value }}
                className={`grid size-9 place-items-center rounded-xl text-white transition-all active:scale-90 ${
                  color === c.key ? "shadow-md ring-2 ring-foreground/60 ring-offset-2 ring-offset-background" : "opacity-90 hover:opacity-100"
                }`}
              >
                {color === c.key && <Check className="size-4" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STACKS.map((s) => (
            <button
              key={s.key}
              onClick={() => setTod(s.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tod === s.key ? `${s.grad} text-white` : "bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
          <Button className="ml-auto" onClick={addOwn} disabled={pending || !name.trim()}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </div>
      </section>

      {backlog.length > 0 && (
        <section className="card-elevated space-y-3 p-3.5 lg:p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Archive className="size-4" />
              </span>
              Backlog
            </p>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {backlog.length} parked
            </span>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              The waiting room, on purpose. Stacking many habits at once kills all of them — so new ones park
              here, and when your current stretch habit holds a 10-day streak, the top one gets promoted into
              the stack. One at a time, consistency first.
            </span>
          </p>
          <div className="space-y-2">
            {backlog.map((h, i) => (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 px-3 py-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground shadow-sm">
                  <Hourglass className="size-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/80">{h.name}</p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {i === 0 ? "up next" : `#${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Fixed calendar week, Sunday → Saturday.
const WEEK_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Map a habit's heatmap (last 14 days, ending today) onto the current
 * Sun→Sat week. Returns 7 cells: true=done, false=missed, null=not yet (future
 * days later this week). Client timezone is fine — cosmetic, like the letters.
 */
function thisWeekCells(arr?: boolean[]): (boolean | null)[] {
  const todayDow = new Date().getDay(); // 0 = Sun … 6 = Sat
  const lastIdx = (arr?.length ?? 0) - 1; // last entry = today
  return Array.from({ length: 7 }, (_, dow) => {
    const offset = dow - todayDow; // 0 today, <0 past, >0 later this week
    if (offset > 0) return null;
    const idx = lastIdx + offset;
    if (!arr || idx < 0) return null;
    return arr[idx];
  });
}

function HabitRow({
  habit,
  grad,
  checked,
  minutes,
  onToggle,
  onSetMinutes,
  onEdit,
  onDelete,
  dots,
}: {
  habit: Habit;
  /** the stack's gradient — every lit element in the row uses it, so tick, icon and timer match */
  grad: string;
  checked: boolean;
  minutes: number | null;
  onToggle: (id: string, checked: boolean) => void;
  onSetMinutes: (id: string, minutes: number | null) => void;
  onEdit: (id: string, patch: { name: string; anchor: string; time_of_day: TimeOfDay }) => void;
  onDelete: (id: string) => void;
  dots?: boolean[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draftName, setDraftName] = useState(habit.name);
  const [draftAnchor, setDraftAnchor] = useState(habit.anchor ?? "");
  const [draftTod, setDraftTod] = useState<TimeOfDay>(habit.time_of_day ?? "anytime");

  const locked = habit.type === "identity" && habit.streak >= 10;
  const chips = habit.target_minutes && !MINUTE_CHIPS.includes(habit.target_minutes)
    ? [...MINUTE_CHIPS, habit.target_minutes].sort((a, b) => a - b)
    : MINUTE_CHIPS;
  const week = thisWeekCells(dots);
  const elapsed = week.filter((d) => d !== null).length; // days so far this week
  const weekHits = week.filter(Boolean).length;
  const HabitIcon = iconFor(habit);
  // Habit's own colour beats the stack colour; painted inline since it's not a class.
  const tint = habitColorValue(habit.color);
  const litClass = tint ? "text-white" : `${grad} text-white`;
  const litStyle = tint ? { backgroundColor: tint } : undefined;

  function openEdit() {
    setDraftName(habit.name);
    setDraftAnchor(habit.anchor ?? "");
    setDraftTod(habit.time_of_day ?? "anytime");
    setConfirmDelete(false);
    setEditing(true);
  }

  function saveEdit() {
    if (!draftName.trim()) return;
    onEdit(habit.id, { name: draftName.trim(), anchor: draftAnchor, time_of_day: draftTod });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2.5 rounded-2xl border border-primary/40 bg-primary/[0.04] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Edit habit</p>
          <button
            onClick={() => setEditing(false)}
            aria-label="Cancel edit"
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Habit name"
          className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={draftAnchor}
            onChange={(e) => setDraftAnchor(e.target.value)}
            placeholder="After… (anchor)"
            className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STACKS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setDraftTod(s.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                draftTod === s.key ? `${s.grad} text-white` : "bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {confirmDelete ? (
            <>
              <span className="text-xs font-medium text-red-500">Delete this habit?</span>
              <Button size="sm" variant="destructive" className="ml-auto" onClick={() => onDelete(habit.id)}>
                Confirm delete
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1 size-3.5" /> Delete
              </Button>
              <Button size="sm" className="ml-auto" onClick={saveEdit} disabled={!draftName.trim()}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors ${
        checked ? "border-primary/40 bg-primary/[0.06]" : "border-border/50 bg-card/70"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* habit icon — decorative, lights up once done */}
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${
            checked ? `${litClass} shadow-md` : "bg-muted text-muted-foreground"
          }`}
          style={checked ? litStyle : undefined}
        >
          <HabitIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold leading-snug ${checked ? "text-muted-foreground" : ""}`}>
            {habit.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-muted-foreground">
            {habit.anchor && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 truncate">
                <Link2 className="size-3 shrink-0" /> after {habit.anchor}
              </span>
            )}
            <span className={`inline-flex items-center gap-0.5 tabular-nums ${habit.streak > 0 ? "text-primary" : ""}`}>
              <Flame className="size-3" /> {habit.streak}d
            </span>
            {locked ? (
              <span className="inline-flex items-center gap-0.5 text-primary">
                <Lock className="size-2.5" /> locked in
              </span>
            ) : (
              habit.best_streak > 0 && <span className="tabular-nums">best {habit.best_streak}d</span>
            )}
          </p>
        </div>
        {/* edit — opens the inline edit panel (name, anchor, time-of-day, delete) */}
        <button
          onClick={openEdit}
          aria-label="Edit habit"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        {/* the tick — a real checkbox circle, always visible */}
        <button
          onClick={() => onToggle(habit.id, !checked)}
          aria-label={checked ? "Mark not done" : "Mark done"}
          className={`grid size-11 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90 ${
            checked
              ? `${litClass} border-transparent shadow-md`
              : "border-border bg-card text-muted-foreground/25 hover:border-primary/60 hover:text-primary/60"
          }`}
          style={checked ? litStyle : undefined}
        >
          <Check className="size-5" strokeWidth={3} />
        </button>
      </div>

      {/* Time logging — appears once the habit is ticked. Chips for the usual lengths,
          plus a free "custom" minutes box (type a number, Enter or tap away to save). */}
      {checked && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto whitespace-nowrap px-3 pb-2.5 [mask-image:linear-gradient(to_right,black_90%,transparent)] lg:[mask-image:none]">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">time</span>
          {chips.map((m) => (
            <button
              key={m}
              onClick={() => onSetMinutes(habit.id, minutes === m ? null : m)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors ${
                minutes === m ? litClass : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              style={minutes === m ? litStyle : undefined}
            >
              {fmtMinutes(m)}
            </button>
          ))}
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="custom"
            defaultValue={minutes != null && !chips.includes(minutes) ? minutes : undefined}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const v = Math.round(Number(e.currentTarget.value));
              if (v > 0) onSetMinutes(habit.id, v);
              e.currentTarget.blur();
            }}
            onBlur={(e) => {
              const v = Math.round(Number(e.currentTarget.value));
              if (v > 0 && v !== minutes) onSetMinutes(habit.id, v);
            }}
            className={`w-[76px] shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground focus:border-primary ${
              minutes != null && !chips.includes(minutes)
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card"
            }`}
          />
          <span className="shrink-0 pr-4 text-[10px] font-medium text-muted-foreground">min</span>
        </div>
      )}

      {/* This week, Sun → Sat. Future days stay faint until they arrive. */}
      <div className="flex items-center gap-1 border-t border-border/40 bg-muted/30 px-3 py-2">
        {week.map((d, i) => {
          const isToday = i === new Date().getDay();
          return (
            <div
              key={i}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 ${
                isToday ? "bg-card/80 shadow-sm ring-1 ring-primary/20" : ""
              }`}
            >
              <span className="text-[9px] font-bold uppercase leading-none text-muted-foreground/70">
                {WEEK_LETTERS[i]}
              </span>
              {d === true ? (
                <span className={`grid size-4 place-items-center rounded-full ${litClass}`} style={litStyle}>
                  <Check className="size-2.5" strokeWidth={4} />
                </span>
              ) : d === false ? (
                <span className="size-4 rounded-full border-[1.5px] border-dashed border-border" />
              ) : (
                <span className="size-4 rounded-full border-[1.5px] border-dotted border-border/40" />
              )}
            </div>
          );
        })}
        <span className="ml-1.5 shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {weekHits}/{elapsed || 0}
        </span>
      </div>
    </div>
  );
}
