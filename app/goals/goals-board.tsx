"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  Telescope,
  CalendarRange,
  CalendarDays,
  CalendarCheck,
  Plus,
  Trash2,
  Check,
  Pencil,
  Save,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Link2,
  Loader2,
  RotateCcw,
  Gauge,
  TrendingUp,
} from "lucide-react";
import {
  addGoal,
  toggleGoal,
  deleteGoal,
  updateGoal,
  saveVision,
  setGoalParent,
  suggestGoalsForLevel,
  addWeekTask,
  updateWeekTask,
  evaluateWeek,
  evaluateMonth,
  askLeoAboutVision,
  type Goal,
  type GoalLevel,
  type GoalsView,
  type MonthCell,
  type MonthlyGrid,
  type WeekDay,
  type WeekTask,
  type WeeklyPlan,
} from "@/lib/actions/goals";

export type GoalsBoardData = {
  view: GoalsView;
  visions: { three_year: string; one_year: string };
  threeYearGoals?: Goal[];
  yearlyGoals?: Goal[];
  monthly?: MonthlyGrid;
  weekly?: WeeklyPlan;
};

const VIEW_META: Record<
  GoalsView,
  { label: string; short: string; icon: React.ComponentType<{ className?: string }>; grad: string; tint: string }
> = {
  three_year: { label: "3-Year", short: "3yr", icon: Telescope, grad: "grad-blue", tint: "tint-blue" },
  yearly: { label: "Yearly", short: "Year", icon: CalendarRange, grad: "grad-blue", tint: "tint-blue" },
  monthly: { label: "Monthly", short: "12mo", icon: CalendarDays, grad: "grad-blue", tint: "tint-blue" },
  weekly: { label: "Weekly", short: "Week", icon: CalendarCheck, grad: "grad-blue", tint: "tint-blue" },
};

const VIEW_ORDER: GoalsView[] = ["three_year", "yearly", "monthly", "weekly"];

export function GoalsBoard({ data }: { data: GoalsBoardData }) {
  const meta = VIEW_META[data.view];

  return (
    <div className="space-y-3 lg:space-y-5">
      <header className={`card-tint ${meta.tint} corner-cut relative overflow-hidden p-3.5 lg:p-6`}>
        <div className="relative flex flex-col gap-3 lg:gap-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl grad-blue text-white shadow-md lg:size-12">
              <Target className="size-5 lg:size-6" />
            </span>
            <div>
              <h1 className="font-display text-lg font-semibold lg:text-2xl">Goals</h1>
              <p className="hidden max-w-xl text-sm text-muted-foreground lg:block">
                Pick a horizon. Cascade the vision down — 3-year to this week — and see how far each
                layer is landing.
              </p>
              <p className="text-xs text-muted-foreground lg:hidden">Cascade the vision, 3-year → this week.</p>
            </div>
          </div>
          <ViewSwitcher active={data.view} />
        </div>
      </header>

      {data.view === "three_year" && (
        <ThreeYearView visions={data.visions} goals={data.threeYearGoals ?? []} />
      )}
      {data.view === "yearly" && (
        <YearlyView visions={data.visions} goals={data.yearlyGoals ?? []} />
      )}
      {data.view === "monthly" && data.monthly && <MonthlyView grid={data.monthly} />}
      {data.view === "weekly" && data.weekly && <WeeklyView plan={data.weekly} />}
    </div>
  );
}

function ViewSwitcher({ active }: { active: GoalsView }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border/50 bg-card/60 p-1 lg:flex lg:w-fit lg:flex-wrap lg:gap-1.5 lg:p-1.5">
      {VIEW_ORDER.map((v) => {
        const m = VIEW_META[v];
        const Icon = m.icon;
        const on = v === active;
        return (
          <Link
            key={v}
            href={`/goals?view=${v}`}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors lg:px-3 ${
              on ? `${m.grad} text-white shadow-sm` : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="hidden size-3.5 sm:block" /> {m.label}
          </Link>
        );
      })}
    </div>
  );
}

// ---- Vision (single field, autosaves the pair) ----

function VisionField({
  which,
  visions,
  label,
  sub,
  motif,
  tagline,
  placeholder,
  icon: Icon = Telescope,
}: {
  which: "three_year" | "one_year";
  visions: { three_year: string; one_year: string };
  label: string;
  sub: string;
  motif: string;
  tagline: string;
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [value, setValue] = useState(which === "three_year" ? visions.three_year : visions.one_year);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const original = which === "three_year" ? visions.three_year : visions.one_year;
  const dirty = value !== original;

  function save() {
    startTransition(async () => {
      const three = which === "three_year" ? value : visions.three_year;
      const one = which === "one_year" ? value : visions.one_year;
      await saveVision(three, one);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const preview = value.trim();

  return (
    // One face in the DOM at a time — no 3D transforms (they break tap targets and
    // clip long text on mobile). Card height follows content, so no inner scroll.
    <section className="h-full min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        {!flipped ? (
        // FRONT — premium cover, tap to open
        <motion.button
          key="front"
          type="button"
          onClick={() => setFlipped(true)}
          aria-label={`Reveal ${label}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="card-tint tint-blue corner-cut relative flex min-h-[21rem] w-full flex-col overflow-hidden p-5 text-left lg:min-h-[26rem]"
        >
          <div className="relative flex w-full flex-1 flex-col justify-between rounded-2xl border border-border/50 bg-card/55 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl grad-blue text-white shadow-md">
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold leading-tight">{label}</h2>
                <p className="text-xs font-medium text-muted-foreground">{sub}</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
              <span className="font-display text-6xl font-bold leading-none text-gradient">{motif}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {tagline}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <RotateCcw className="size-3.5" /> {preview ? "Tap to flip & read" : "Tap to write your vision"}
            </span>
          </div>
        </motion.button>
        ) : (
        // BACK — full vision, read / edit
        <motion.div
          key="back"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="card-elevated corner-cut flex min-h-[21rem] w-full flex-col gap-3 p-5 lg:min-h-[26rem]"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Icon className="size-4 text-primary" /> {label}
            </h2>
            <div className="flex items-center gap-1.5">
              {editing ? (
                <button
                  onClick={save}
                  disabled={!dirty || pending}
                  className="inline-flex items-center gap-1.5 rounded-full grad-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40"
                >
                  {saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                  {saved ? "Saved" : pending ? "Saving…" : "Save"}
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
              )}
              <button
                onClick={() => {
                  setEditing(false);
                  setFlipped(false);
                }}
                aria-label="Flip back"
                className="grid size-8 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>
          {editing ? (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="min-h-[14rem] w-full flex-1 resize-y rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-sm leading-relaxed outline-none ring-primary/40 focus:ring-2"
            />
          ) : (
            /* card grows with the text — the whole vision reads without scrolling */
            <p
              className={`min-w-0 flex-1 whitespace-pre-line break-words [overflow-wrap:anywhere] pr-1 text-sm leading-relaxed ${
                preview ? "text-foreground/90" : "italic text-muted-foreground"
              }`}
            >
              {preview || placeholder}
            </p>
          )}
        </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---- 3-year & yearly views ----

/** "Ask Leo" — blunt on-demand read of a vision + its goals. */
function AskLeoVision({ level }: { level: "three_year" | "yearly" }) {
  const [text, setText] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState(false);

  async function ask() {
    setAsking(true);
    setErr(false);
    try {
      setText(await askLeoAboutVision(level));
    } catch {
      setErr(true);
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="card-elevated space-y-2 p-4">
      <button
        onClick={ask}
        disabled={asking}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
      >
        {asking ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {asking ? "Leo's reading…" : text ? "Ask Leo again" : "Ask Leo — is this plan real?"}
      </button>
      {err && <p className="text-[11px] text-muted-foreground">Leo couldn&apos;t reach through. Try again.</p>}
      {text && (
        <p className="whitespace-pre-line rounded-2xl bg-card/70 p-3 text-sm leading-relaxed text-foreground/90">
          {text}
        </p>
      )}
    </section>
  );
}

function ThreeYearView({
  visions,
  goals,
}: {
  visions: { three_year: string; one_year: string };
  goals: Goal[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <VisionField
          which="three_year"
          visions={visions}
          label="3-year vision"
          sub="Who you become by 2029"
          motif="2029"
          tagline="Future you, 3 years out"
          icon={Telescope}
          placeholder="In three years, who are you and what does your life look like?"
        />
        <GoalList
          level="three_year"
          title="Achieve by then"
          blurb="Big outcomes that prove the vision is real."
          accent="grad-blue"
          tint="tint-blue"
          icon={Target}
          initial={goals}
          readOnly={false}
          showSuggest
        />
      </div>
      <AskLeoVision level="three_year" />
    </div>
  );
}

function YearlyView({
  visions,
  goals,
}: {
  visions: { three_year: string; one_year: string };
  goals: Goal[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <VisionField
          which="one_year"
          visions={visions}
          label="1-year vision"
          sub="What changes by end of 2026"
          motif="2026"
          tagline="One trip around the sun"
          icon={CalendarRange}
          placeholder="A year from now, what has changed that you're proud of?"
        />
        <GoalList
          level="yearly"
          title="This year's goals"
          blurb="The few outcomes that would make this year a win."
          accent="grad-blue"
          tint="tint-blue"
          icon={Target}
          initial={goals}
          readOnly={false}
          showSuggest
        />
      </div>
      <AskLeoVision level="yearly" />
    </div>
  );
}

// ---- Reusable goal list (add / toggle / edit / delete / parent link / Leo) ----

function GoalList({
  level,
  title,
  blurb,
  accent,
  tint,
  icon: Icon,
  initial,
  readOnly,
  period,
  parentOptions,
  parentLabels,
  showSuggest,
  compact,
}: {
  level: GoalLevel;
  title?: string;
  blurb?: string;
  accent: string;
  tint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  initial: Goal[];
  readOnly: boolean;
  period?: string;
  parentOptions?: Goal[];
  parentLabels?: Record<string, string>;
  showSuggest?: boolean;
  compact?: boolean;
}) {
  const [goals, setGoals] = useState<Goal[]>(initial);
  const [draft, setDraft] = useState("");
  const [parentDraft, setParentDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const tempSeq = useRef(0);

  const doneCount = goals.filter((g) => g.done).length;
  const hasParentPicker = !readOnly && !!parentOptions && parentOptions.length > 0;

  function labelFor(id: string | null): string | null {
    if (!id) return null;
    return goals.find((g) => g.id === id)?.content ?? parentLabels?.[id] ?? null;
  }

  function insert(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const parentId = parentDraft || null;
    const temp: Goal = {
      id: `temp-${tempSeq.current++}`,
      level,
      period: period ?? "",
      content: clean,
      action: null,
      day_index: null,
      done: false,
      rank: goals.length,
      parent_id: parentId,
    };
    setGoals((g) => [...g, temp]);
    startTransition(async () => {
      const real = await addGoal(level, clean, parentId, period);
      if (real) setGoals((g) => g.map((x) => (x.id === temp.id ? real : x)));
    });
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    insert(text);
  }

  function acceptSuggestion(text: string) {
    setSuggestions((s) => s.filter((x) => x !== text));
    insert(text);
  }

  async function runSuggest() {
    setSuggesting(true);
    setSuggestErr(null);
    try {
      const res = await suggestGoalsForLevel(level, period ?? "");
      const have = new Set(goals.map((g) => g.content.trim().toLowerCase()));
      const fresh = res.filter((s) => !have.has(s.trim().toLowerCase()));
      setSuggestions(fresh);
      if (fresh.length === 0) setSuggestErr("Leo had nothing new to add. Add your own below.");
    } catch {
      setSuggestErr("Leo couldn't reach through right now. Try again or add manually.");
    } finally {
      setSuggesting(false);
    }
  }

  function toggle(goal: Goal) {
    const next = !goal.done;
    setGoals((g) => g.map((x) => (x.id === goal.id ? { ...x, done: next } : x)));
    startTransition(() => {
      toggleGoal(goal.id, next);
    });
  }

  function remove(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id));
    startTransition(() => {
      deleteGoal(id);
    });
  }

  function beginEdit(goal: Goal) {
    setEditing(goal.id);
    setEditText(goal.content);
  }

  function commitEdit(id: string) {
    const text = editText.trim();
    setEditing(null);
    if (!text) return;
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, content: text } : x)));
    startTransition(() => {
      updateGoal(id, text);
    });
  }

  function changeParent(id: string, parentId: string | null) {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, parent_id: parentId } : x)));
    startTransition(() => {
      setGoalParent(id, parentId);
    });
  }

  const Body = (
    <>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {goals.map((goal) => {
            const parentLabel = labelFor(goal.parent_id);
            return (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="group flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/80 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !readOnly && toggle(goal)}
                    disabled={readOnly}
                    aria-label={goal.done ? "Mark not done" : "Mark done"}
                    className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors disabled:cursor-default ${
                      goal.done ? `${accent} border-transparent text-white` : "border-border text-transparent hover:border-primary"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </button>

                  {editing === goal.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(goal.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      onBlur={() => commitEdit(goal.id)}
                      className="flex-1 rounded-lg border border-border/60 bg-card px-2 py-1 text-sm outline-none ring-primary/40 focus:ring-2"
                    />
                  ) : (
                    <span className={`flex-1 text-sm ${goal.done ? "text-muted-foreground line-through" : ""}`}>
                      {goal.content}
                    </span>
                  )}

                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity lg:gap-1 lg:opacity-0 lg:group-hover:opacity-100">
                      <button onClick={() => beginEdit(goal)} aria-label="Edit" className="text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => remove(goal.id)} aria-label="Delete" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {hasParentPicker ? (
                  <div className="flex items-center gap-1.5 pl-8">
                    <Link2 className="size-3 shrink-0 text-muted-foreground" />
                    <select
                      value={goal.parent_id ?? ""}
                      onChange={(e) => changeParent(goal.id, e.target.value || null)}
                      className="max-w-full truncate rounded-lg border border-border/50 bg-card px-2 py-1 text-[11px] text-muted-foreground outline-none ring-primary/40 focus:ring-2"
                    >
                      <option value="">— not linked —</option>
                      {parentOptions!.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.content}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  parentLabel && (
                    <p className="flex items-center gap-1.5 pl-8 text-[11px] text-muted-foreground">
                      <Link2 className="size-3 shrink-0" /> serves: {parentLabel}
                    </p>
                  )
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {goals.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-3 py-3 text-sm text-muted-foreground">
            {readOnly ? "Nothing was set here." : "Nothing set yet. Add the first one below."}
          </p>
        )}
      </div>

      {showSuggest && !readOnly && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={runSuggest}
              disabled={suggesting}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
            >
              {suggesting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {suggesting ? "Leo's thinking…" : suggestions.length ? "Ask Leo again" : "Suggest with Leo"}
            </button>
            {suggestErr && (
              <button onClick={runSuggest} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                <RotateCcw className="size-3" /> retry
              </button>
            )}
          </div>
          {suggestErr && <p className="text-[11px] text-muted-foreground">{suggestErr}</p>}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => acceptSuggestion(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-left text-xs transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="size-3 shrink-0" /> {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="space-y-2">
          {hasParentPicker && (
            <div className="flex items-center gap-1.5">
              <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
              <select
                value={parentDraft}
                onChange={(e) => setParentDraft(e.target.value)}
                className="flex-1 truncate rounded-xl border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground outline-none ring-primary/40 focus:ring-2"
              >
                <option value="">Link new goal to… (optional)</option>
                {parentOptions!.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.content}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Add a goal…"
              className="flex-1 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2"
            />
            <button
              onClick={add}
              disabled={!draft.trim()}
              className={`grid size-10 shrink-0 place-items-center rounded-2xl ${accent} text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0`}
              aria-label="Add goal"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Compact = embedded inside a month card (no section chrome).
  if (compact) return <div className="space-y-3">{Body}</div>;

  return (
    <section className={`card-tint ${tint ?? "tint-blue"} corner-cut flex h-full flex-col gap-3.5 p-3.5 lg:gap-4 lg:p-5`}>
      {(title || Icon) && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${accent} text-white shadow-md`}>
                <Icon className="size-5" />
              </span>
            )}
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
              {blurb && <p className="text-xs font-medium text-muted-foreground">{blurb}</p>}
            </div>
          </div>
          {goals.length > 0 && (
            <span className="rounded-full bg-card/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {doneCount}/{goals.length}
            </span>
          )}
        </div>
      )}
      {Body}
    </section>
  );
}

// ---- Monthly view: 12 boxes ----

function pctTone(pct: number): string {
  if (pct >= 75) return "text-[oklch(0.62_0.17_150)]";
  if (pct >= 40) return "text-[oklch(0.74_0.15_70)]";
  return "text-[oklch(0.62_0.2_25)]";
}

function MonthlyView({ grid }: { grid: MonthlyGrid }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-lg font-semibold">{grid.year} · by month</h2>
        <span className="text-xs text-muted-foreground">Past months locked · tap a live month to plan</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {grid.months.map((m) => (
          <MonthCard
            key={m.period}
            cell={m}
            parentOptions={grid.parentOptions}
            parentLabels={grid.parentLabels}
          />
        ))}
      </div>
    </div>
  );
}

function MonthCard({
  cell,
  parentOptions,
  parentLabels,
}: {
  cell: MonthCell;
  parentOptions: Goal[];
  parentLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(cell.isCurrent);
  const [outlook, setOutlook] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readErr, setReadErr] = useState(false);

  async function askLeo() {
    setReading(true);
    setReadErr(false);
    try {
      setOutlook(await evaluateMonth(cell.period));
    } catch {
      setReadErr(true);
    } finally {
      setReading(false);
    }
  }

  const tone = pctTone(cell.pct);

  return (
    <section
      className={`corner-cut flex flex-col gap-3 p-4 ${
        cell.isCurrent ? "card-tint tint-blue" : "card-elevated"
      } ${cell.readOnly ? "opacity-80" : ""}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-semibold">{cell.label}</span>
          {cell.isCurrent && (
            <span className="rounded-full grad-blue px-2 py-0.5 text-[10px] font-bold text-white">NOW</span>
          )}
          {cell.readOnly && <span className="text-[10px] font-semibold text-muted-foreground">locked</span>}
        </div>
        <div className="flex items-center gap-2">
          {cell.total > 0 && (
            <span className={`text-xs font-bold ${tone}`}>{cell.pct}%</span>
          )}
          <span className="text-xs text-muted-foreground">
            {cell.done}/{cell.total}
          </span>
        </div>
      </button>

      {cell.total > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${cell.pct >= 75 ? "grad-emerald" : cell.pct >= 40 ? "grad-amber" : "grad-rose"}`} style={{ width: `${cell.pct}%` }} />
        </div>
      )}

      {open && (
        <>
          <GoalList
            level="monthly"
            accent="grad-blue"
            initial={cell.goals}
            readOnly={cell.readOnly}
            period={cell.period}
            parentOptions={parentOptions}
            parentLabels={parentLabels}
            showSuggest={cell.isCurrent}
            compact
          />

          {cell.isCurrent && (
            <div className="space-y-2 border-t border-border/40 pt-3">
              <button
                onClick={askLeo}
                disabled={reading}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
              >
                {reading ? <Loader2 className="size-3.5 animate-spin" /> : <Gauge className="size-3.5" />}
                {reading ? "Leo's reading…" : outlook ? "Re-check likelihood" : "How likely am I? (Leo)"}
              </button>
              {readErr && <p className="text-[11px] text-muted-foreground">Leo couldn&apos;t reach through. Try again.</p>}
              {outlook && (
                <p className="whitespace-pre-line rounded-2xl bg-card/70 p-3 text-xs leading-relaxed text-foreground/90">
                  {outlook}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---- Weekly view: 7 day boxes + analytics ----

function WeeklyView({ plan }: { plan: WeeklyPlan }) {
  const [verdict, setVerdict] = useState<string | null>(plan.verdict);
  const [evaluating, setEvaluating] = useState(false);
  const [evalErr, setEvalErr] = useState(false);
  // Live completion, updated as tasks are ticked/added — counts per day now.
  const [dayStats, setDayStats] = useState<Record<number, { planned: number; done: number }>>(() =>
    Object.fromEntries(
      plan.days.map((d) => [
        d.dayIndex,
        { planned: d.tasks.length, done: d.tasks.filter((t) => t.done).length },
      ])
    )
  );

  const planned = Object.values(dayStats).reduce((s, x) => s + x.planned, 0);
  const done = Object.values(dayStats).reduce((s, x) => s + x.done, 0);
  const pct = planned ? Math.round((done / planned) * 100) : 0;

  function reportDay(dayIndex: number, plannedN: number, doneN: number) {
    setDayStats((m) => ({ ...m, [dayIndex]: { planned: plannedN, done: doneN } }));
  }

  async function runEval() {
    setEvaluating(true);
    setEvalErr(false);
    try {
      const res = await evaluateWeek(plan.period);
      setVerdict(res.verdict);
    } catch {
      setEvalErr(true);
    } finally {
      setEvaluating(false);
    }
  }

  const trendBars = [...plan.trend, { period: plan.period, pct }];

  return (
    <div className="space-y-5">
      <WeekNav plan={plan} />

      {!plan.readOnly && <WeekSuggest plan={plan} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {plan.days.map((d) => (
          <DayBox
            // task count in the key so a Leo-suggested task (added + router.refresh) remounts just that day
            key={`${plan.period}-${d.dayIndex}-${d.tasks.length}`}
            period={plan.period}
            day={d}
            readOnly={plan.readOnly}
            onReport={reportDay}
          />
        ))}
      </div>

      {/* Analytics */}
      <section className="card-elevated space-y-4 p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <TrendingUp className="size-4 text-primary" /> Week analytics
          </h3>
          <span className={`text-lg font-bold ${pctTone(pct)}`}>{pct}%</span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Planned: <b className="text-foreground">{planned}</b> task{planned === 1 ? "" : "s"}</span>
          <span>Done: <b className="text-foreground">{done}</b></span>
          <span>Missed: <b className="text-foreground">{planned - done}</b></span>
        </div>

        {plan.monthGoals.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Serving this month: {plan.monthGoals.join(" · ")}
          </p>
        )}

        {/* Trend across weeks */}
        {trendBars.length > 1 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trend</p>
            <div className="flex items-end gap-2">
              {trendBars.map((t, i) => (
                <div key={t.period} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-16 w-full items-end">
                    <div
                      className={`w-full rounded-t-md ${i === trendBars.length - 1 ? "grad-blue" : "bg-muted-foreground/40"}`}
                      style={{ height: `${Math.max(t.pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leo verdict */}
        <div className="space-y-2 border-t border-border/40 pt-3">
          <button
            onClick={runEval}
            disabled={evaluating}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
          >
            {evaluating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {evaluating ? "Leo's evaluating…" : verdict ? "Ask Leo again" : "Ask Leo — evaluate this week"}
          </button>
          {evalErr && <p className="text-[11px] text-muted-foreground">Leo couldn&apos;t reach through. Try again.</p>}
          {verdict && (
            <p className="whitespace-pre-line rounded-2xl bg-card/70 p-3 text-sm leading-relaxed text-foreground/90">
              {verdict}
            </p>
          )}
          {plan.readOnly && !verdict && (
            <p className="text-[11px] text-muted-foreground">This week is locked. Run an evaluation to see how it landed.</p>
          )}
        </div>
      </section>
    </div>
  );
}

/** "Suggest with Leo" for the week — proposes tasks, drops the ones you pick onto a chosen day. */
function WeekSuggest({ plan }: { plan: WeeklyPlan }) {
  const router = useRouter();
  // Default target: today if it has room, else the first day with a free slot, else day 0.
  const firstOpen = plan.days.find((d) => d.tasks.length < MAX_TASKS_PER_DAY);
  const defaultDay =
    plan.days.find((d) => d.isToday && d.tasks.length < MAX_TASKS_PER_DAY)?.dayIndex ??
    firstOpen?.dayIndex ??
    plan.days[0]?.dayIndex ??
    0;
  const [target, setTarget] = useState(defaultDay);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const targetDay = plan.days.find((d) => d.dayIndex === target);
  const targetFull = (targetDay?.tasks.length ?? 0) >= MAX_TASKS_PER_DAY;

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await suggestGoalsForLevel("weekly", plan.period);
      const have = new Set(
        plan.days.flatMap((d) => d.tasks.map((t) => t.goal.trim().toLowerCase()))
      );
      const fresh = res.filter((s) => !have.has(s.trim().toLowerCase()));
      setSuggestions(fresh);
      if (fresh.length === 0) setErr("Leo had nothing new to add. Set your own on a day below.");
    } catch {
      setErr("Leo couldn't reach through right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function accept(text: string) {
    if (targetFull) return;
    setAdding(text);
    try {
      await addWeekTask(plan.period, target, text, "");
      setSuggestions((s) => s.filter((x) => x !== text));
      router.refresh(); // pull the new task into its DayBox
    } catch {
      setErr("Couldn't add that one. Try again.");
    } finally {
      setAdding(null);
    }
  }

  return (
    <section className="card-tint tint-blue corner-cut space-y-3 p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Sparkles className="size-4 text-primary" /> Plan the week with Leo
        </h3>
        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Add to</span>
          <select
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="rounded-lg border border-border/60 bg-card px-2 py-1 font-semibold outline-none ring-primary/40 focus:ring-2"
          >
            {plan.days.map((d) => (
              <option key={d.dayIndex} value={d.dayIndex}>
                {d.weekday}
                {d.isToday ? " (today)" : ""} · {d.tasks.length}/{MAX_TASKS_PER_DAY}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {busy ? "Leo's thinking…" : suggestions.length ? "Ask Leo again" : "Suggest tasks for this week"}
      </button>

      {err && <p className="text-[11px] text-muted-foreground">{err}</p>}
      {targetFull && suggestions.length > 0 && (
        <p className="text-[11px] text-muted-foreground">That day&apos;s full — pick another day to add to.</p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => accept(s)}
              disabled={targetFull || adding === s}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-left text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {adding === s ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3 shrink-0" />} {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function WeekNav({ plan }: { plan: WeeklyPlan }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl grad-blue text-white shadow-md">
          <CalendarCheck className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold leading-tight">{plan.label}</h2>
          <p className="text-xs font-medium text-muted-foreground">
            {plan.isCurrent ? "This week" : "Past week · read-only"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!plan.isCurrent && (
          <Link
            href="/goals?view=weekly"
            className="rounded-xl border border-border/60 bg-card px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-muted"
          >
            This week
          </Link>
        )}
        <Link
          href={`/goals?view=weekly&week=${plan.prevWeek}`}
          aria-label="Previous week"
          className="grid size-8 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        {plan.nextWeek ? (
          <Link
            href={`/goals?view=weekly&week=${plan.nextWeek}`}
            aria-label="Next week"
            className="grid size-8 place-items-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className="grid size-8 place-items-center rounded-xl border border-border/40 bg-card/50 text-muted-foreground/40">
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

// Mirrors MAX_WEEK_TASKS_PER_DAY in lib/actions/goals.ts
const MAX_TASKS_PER_DAY = 5;

function DayBox({
  period,
  day,
  readOnly,
  onReport,
}: {
  period: string;
  day: WeekDay;
  readOnly: boolean;
  onReport: (dayIndex: number, planned: number, done: number) => void;
}) {
  const [tasks, setTasks] = useState<WeekTask[]>(day.tasks);
  const [goalDraft, setGoalDraft] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [, startTransition] = useTransition();

  function report(next: WeekTask[]) {
    onReport(day.dayIndex, next.length, next.filter((t) => t.done).length);
  }

  function add() {
    const goal = goalDraft.trim();
    if (!goal || tasks.length >= MAX_TASKS_PER_DAY) return;
    const action = actionDraft.trim();
    setGoalDraft("");
    setActionDraft("");
    const temp: WeekTask = { id: `temp-${Date.now()}`, goal, action, done: false };
    const next = [...tasks, temp];
    setTasks(next);
    report(next);
    startTransition(async () => {
      const real = await addWeekTask(period, day.dayIndex, goal, action);
      setTasks((cur) =>
        real
          ? cur.map((t) => (t.id === temp.id ? { id: real.id, goal: real.content, action: real.action ?? "", done: real.done } : t))
          : cur.filter((t) => t.id !== temp.id)
      );
    });
  }

  function toggle(task: WeekTask) {
    if (readOnly || task.id.startsWith("temp-")) return;
    const next = tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t));
    setTasks(next);
    report(next);
    startTransition(() => {
      toggleGoal(task.id, !task.done);
    });
  }

  function remove(task: WeekTask) {
    if (readOnly) return;
    const next = tasks.filter((t) => t.id !== task.id);
    setTasks(next);
    report(next);
    if (!task.id.startsWith("temp-")) {
      startTransition(() => {
        deleteGoal(task.id);
      });
    }
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors ${
        day.isToday ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card/70"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {day.weekday}
          {day.isToday && <span className="ml-1.5 text-primary">• today</span>}
        </span>
        {tasks.length > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              doneCount === tasks.length ? "grad-blue text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>

      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          readOnly={readOnly}
          onToggle={() => toggle(task)}
          onDelete={() => remove(task)}
        />
      ))}

      {!readOnly && tasks.length < MAX_TASKS_PER_DAY && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-border/60 p-2">
          <input
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={tasks.length === 0 ? "Add a task for this day" : "Add another task"}
            className="w-full rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-sm font-medium outline-none ring-primary/40 focus:ring-2"
          />
          <div className="flex items-center gap-1.5">
            <input
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Action to take (optional)"
              className="w-full rounded-lg border border-border/40 bg-card/60 px-2.5 py-1.5 text-xs outline-none ring-primary/40 focus:ring-2"
            />
            <button
              onClick={add}
              disabled={!goalDraft.trim()}
              aria-label="Add task"
              className="grid size-7 shrink-0 place-items-center rounded-lg grad-blue text-white transition-opacity disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      )}
      {!readOnly && tasks.length >= MAX_TASKS_PER_DAY && (
        <span className="text-[10px] text-muted-foreground">Day full — {MAX_TASKS_PER_DAY} tasks max.</span>
      )}
    </div>
  );
}

function TaskRow({
  task,
  readOnly,
  onToggle,
  onDelete,
}: {
  task: WeekTask;
  readOnly: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [goal, setGoal] = useState(task.goal);
  const [action, setAction] = useState(task.action);
  const savedRef = useRef({ goal: task.goal, action: task.action });
  const [, startTransition] = useTransition();

  function persist() {
    if (readOnly || task.id.startsWith("temp-")) return;
    if (!goal.trim()) {
      setGoal(savedRef.current.goal);
      return;
    }
    if (goal.trim() === savedRef.current.goal.trim() && action.trim() === savedRef.current.action.trim()) return;
    savedRef.current = { goal, action };
    startTransition(() => {
      updateWeekTask(task.id, goal, action);
    });
  }

  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-2 ${task.done ? "border-primary/30 bg-primary/5" : "border-border/40 bg-card/60"}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={readOnly || task.id.startsWith("temp-")}
          aria-label={task.done ? "Mark not done" : "Mark done"}
          className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            task.done ? "grad-blue border-transparent text-white" : "border-border text-transparent hover:border-primary"
          }`}
        >
          <Check className="size-3.5" />
        </button>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={persist}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          disabled={readOnly}
          placeholder="Task"
          className={`w-full min-w-0 bg-transparent text-sm font-medium outline-none disabled:opacity-70 ${
            task.done ? "line-through text-muted-foreground" : ""
          }`}
        />
        {!readOnly && (
          <button
            onClick={onDelete}
            aria-label="Delete task"
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <input
        value={action}
        onChange={(e) => setAction(e.target.value)}
        onBlur={persist}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        disabled={readOnly}
        placeholder="Action to take (optional)"
        className="w-full bg-transparent pl-7 text-xs text-muted-foreground outline-none disabled:opacity-70"
      />
    </div>
  );
}
