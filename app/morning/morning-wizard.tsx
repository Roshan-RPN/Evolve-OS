"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { critiqueDraftPlan, submitMorningEntry, type MorningInput } from "@/lib/actions/morning";
import { TimeWheel } from "@/components/time-wheel";
import { CoachAvatar } from "@/components/coach-avatar";
import { LeoFollowup } from "@/components/leo-followup";
import {
  ChevronLeft,
  Sunrise,
  Plus,
  HeartPulse,
  Swords,
  Heart,
  ListChecks,
  CalendarClock,
  ScrollText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@/components/close-button";

const PRIORITIES = [
  { p: 1, label: "P1", desc: "Critical" },
  { p: 2, label: "P2", desc: "Important" },
  { p: 3, label: "P3", desc: "Normal" },
  { p: 4, label: "P4", desc: "Someday" },
] as const;

const EMPTY: MorningInput = {
  affirmations: "",
  affirmation_truth_score: 5,
  emotion: "",
  energy: 5,
  top_priorities: ["", "", ""],
  gratitudes: ["", "", "", "", ""],
  gratitude_felt_most: "",
  todo: [""],
  schedule: [{ time: "09:00", block: "", priority: 2 }],
};

// Tap-to-add sparks for the affirmation step — beat the blank-page stall.
// Complete lines you can use as-is:
const AFFIRMATION_SPARKS = [
  "I am someone who keeps promises to myself",
  "I move before I feel ready",
  "I do the hard thing first",
  "Discipline is my default, not my mood",
  "I am building something bigger than today",
];
// Common openers — tap to drop the start, then finish it in your own words.
const AFFIRMATION_STARTERS = [
  "I am someone who ",
  "I always ",
  "I no longer ",
  "Today I choose to ",
];

function truthVerdict(score: number) {
  if (score <= 3) return { text: "Doesn't land yet — say it anyway.", cls: "text-muted-foreground" };
  if (score <= 6) return { text: "Getting warmer. Read it out loud.", cls: "text-[var(--bronze)]" };
  if (score <= 8) return { text: "Feels real. Hold that.", cls: "text-primary" };
  return { text: "Bone-deep. Now act like it.", cls: "text-emerald" };
}

// One-tap emotion words — most mornings are one of these.
const EMOTION_CHIPS = ["motivated", "calm", "hopeful", "anxious", "flat", "tired", "scattered", "fired up"];

function energyVerdict(score: number) {
  if (score <= 3) return { text: "Running on fumes — plan a lighter day, win it anyway.", cls: "text-muted-foreground" };
  if (score <= 6) return { text: "Workable. Protect the morning hours.", cls: "text-[var(--bronze)]" };
  if (score <= 8) return { text: "Good tank. Spend it on the hard thing first.", cls: "text-primary" };
  return { text: "Full send. Days like this build the vision.", cls: "text-emerald" };
}

/* Every step opens with the same banner — one flat confident colour,
   icon chip, punchy title. No gradients. */
function StepHero({
  grad,
  icon: Icon,
  title,
  sub,
}: {
  grad: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <div className={`corner-cut relative overflow-hidden ${grad} p-4 text-white`}>
      <div className="relative flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold leading-none tracking-tight">{title}</p>
          <p className="mt-1 text-xs font-medium text-white/85">{sub}</p>
        </div>
      </div>
    </div>
  );
}

const STEP_TITLES = [
  "Affirmations",
  "Emotions & Energy",
  "Top 3 Priorities",
  "5 Gratitudes",
  "To-Do List",
  "Schedule",
  "Review",
];

export function MorningWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<MorningInput>(EMPTY);
  const [critique, setCritique] = useState<string | null>(null);
  const [loadingCritique, setLoadingCritique] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState(false);
  const [lockErrorDetail, setLockErrorDetail] = useState<string | null>(null);
  const [story, setStory] = useState<string | null>(null);

  const isReview = stepIndex === STEP_TITLES.length - 1;
  const progress = story ? 100 : ((stepIndex + 1) / STEP_TITLES.length) * 100;

  async function goToReview() {
    setStepIndex(STEP_TITLES.length - 1);
    if (critique || loadingCritique) return;
    setLoadingCritique(true);
    try {
      const result = await critiqueDraftPlan({
        top_priorities: data.top_priorities,
        todo: data.todo.filter(Boolean),
        schedule: data.schedule.filter((s) => s.time || s.block),
      });
      setCritique(result);
    } catch (e) {
      console.error("morning critique failed:", e);
      // Don't block lock-in — leave critique empty; Leo just skips his read.
      setCritique("");
    } finally {
      setLoadingCritique(false);
    }
  }

  async function lockIn() {
    setLocking(true);
    setLockError(false);
    setLockErrorDetail(null);
    try {
      const result = await submitMorningEntry({
        ...data,
        todo: data.todo.filter(Boolean),
        schedule: data.schedule.filter((s) => s.time || s.block),
      });
      setStory(result.story);
    } catch (e) {
      console.error("morning lock-in failed:", e);
      setLockError(true);
      // Surface the real reason (DB/network) so a stuck lock-in is diagnosable
      // instead of hiding behind a generic "check your connection" line.
      setLockErrorDetail(e instanceof Error ? e.message : String(e));
    } finally {
      setLocking(false);
    }
  }

  if (story) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-6 lg:p-6">
        <CloseButton />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="card-elevated overflow-hidden rounded-3xl shadow-2xl"
        >
          {/* immersive gradient hero — matches the step banners' vibe */}
          <div className="grad-coral relative overflow-hidden p-6 text-white">
            <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-6 size-36 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                <CoachAvatar mood="pushing" size={52} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Before you go</p>
                <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
                  Carry this into the day
                </h2>
              </div>
            </div>
          </div>

          {/* story as a pull-quote from Leo */}
          <div className="relative bg-card p-6">
            <Sunrise className="absolute right-5 top-5 size-8 text-primary/10" />
            <p className="relative border-l-2 border-primary/30 pl-4 text-[15px] font-medium leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {story}
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="h-12 border-primary/35 bg-card font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary"
                onClick={() => { setStory(null); setStepIndex(STEP_TITLES.length - 1); }}
              >
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button className="h-12 flex-1 text-[15px] font-semibold" onClick={() => router.push("/")}>
                <Sunrise className="size-4" /> Start the day
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.9rem+env(safe-area-inset-top))] lg:justify-start lg:gap-6 lg:p-6 lg:pt-10">
      {/* header — step context + close, always in reach */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Step {stepIndex + 1} of {STEP_TITLES.length}
            </p>
            <p className="truncate font-display text-lg font-semibold leading-tight">
              {STEP_TITLES[stepIndex]}
            </p>
          </div>
          <CloseButton inline />
        </div>
        <Progress value={progress} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Card className="shadow-xl">
            <CardContent className="space-y-5 pt-6">
              {stepIndex === 0 && (
                <div className="space-y-3">
                  <StepHero
                    grad="solid-coral"
                    icon={Sunrise}
                    title="I AM…"
                    sub="Write it as if it's already true, then go prove it by tonight."
                  />

                  <Textarea
                    rows={2}
                    value={data.affirmations}
                    onChange={(e) => setData({ ...data, affirmations: e.target.value })}
                    placeholder="e.g. I am someone who keeps the promises I make to myself"
                    className="min-h-16 font-display text-base font-semibold leading-relaxed"
                  />

                  {/* One-tap sparks — kill the blank page. Complete lines: use as-is. */}
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Use one as-is</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AFFIRMATION_SPARKS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            affirmations: data.affirmations.trim()
                              ? `${data.affirmations.replace(/\s+$/, "")}\n${s}`
                              : s,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                      >
                        <Plus className="size-3" /> {s}
                      </button>
                    ))}
                  </div>
                  {/* Openers — drop the start, finish in your own words. */}
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Or start one, finish it yourself</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AFFIRMATION_STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setData({
                            ...data,
                            affirmations: data.affirmations.trim()
                              ? `${data.affirmations.replace(/\s+$/, "")}\n${s}`
                              : s,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary/90 transition-colors hover:bg-primary/10"
                      >
                        <Plus className="size-3" /> {s.trim()}…
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label>How true does this feel right now?</Label>
                      <span className="font-display text-lg font-bold tabular-nums text-primary">
                        {data.affirmation_truth_score}/10
                      </span>
                    </div>
                    <Slider
                      value={[data.affirmation_truth_score]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) =>
                        setData({ ...data, affirmation_truth_score: Array.isArray(v) ? v[0] : v })
                      }
                    />
                    <p className={`text-xs font-semibold ${truthVerdict(data.affirmation_truth_score).cls}`}>
                      {truthVerdict(data.affirmation_truth_score).text}
                    </p>
                  </div>
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-rose"
                    icon={HeartPulse}
                    title="HOW YOU'RE FEELING"
                    sub="Name the main feeling — once named, it stops quietly steering your day."
                  />
                  <div className="space-y-2">
                    <Input
                      value={data.emotion}
                      onChange={(e) => setData({ ...data, emotion: e.target.value })}
                      placeholder="What are you feeling most right now?"
                      className="font-display text-base font-semibold"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {EMOTION_CHIPS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setData({ ...data, emotion: e })}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            data.emotion === e
                              ? "border-transparent grad-rose text-white shadow-sm"
                              : "border-border/60 bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label>How much energy do you have right now?</Label>
                      <span className="font-display text-lg font-bold tabular-nums text-primary">
                        {data.energy}/10
                      </span>
                    </div>
                    <Slider
                      value={[data.energy]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) => setData({ ...data, energy: Array.isArray(v) ? v[0] : v })}
                    />
                    <p className={`text-xs font-semibold ${energyVerdict(data.energy).cls}`}>
                      {energyVerdict(data.energy).text}
                    </p>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-blue"
                    icon={Swords}
                    title="TODAY'S TOP 3"
                    sub="If only three things get done today, which three? Be specific — name the actual task."
                  />
                  <div className="space-y-2.5">
                    {data.top_priorities.map((p, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl grad-blue font-display text-sm font-extrabold text-white shadow-sm">
                          {i + 1}
                        </span>
                        <Input
                          value={p}
                          onChange={(e) => {
                            const next = [...data.top_priorities];
                            next[i] = e.target.value;
                            setData({ ...data, top_priorities: next });
                          }}
                          placeholder={
                            [
                              "Must happen no matter what — e.g. Submit the tax forms",
                              "Moves the vision — e.g. Write 500 words of the book",
                              "The one you keep avoiding — e.g. Call the dentist",
                            ][i]
                          }
                          className="font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-emerald"
                    icon={Heart}
                    title="FIVE GRATITUDES"
                    sub="Name five things you're grateful for right now. Small ones count."
                  />
                  <div className="space-y-2.5">
                    {data.gratitudes.map((g, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl grad-emerald font-display text-sm font-extrabold text-white shadow-sm">
                          {i + 1}
                        </span>
                        <Input
                          value={g}
                          onChange={(e) => {
                            const next = [...data.gratitudes];
                            next[i] = e.target.value;
                            setData({ ...data, gratitudes: next });
                          }}
                          placeholder={
                            [
                              "A person — e.g. My sister called just to check in",
                              "Something your body did — e.g. Legs held up on the long walk",
                              "Something you'd miss if it vanished — e.g. Hot water in the morning",
                              "A small comfort — e.g. Coffee on the balcony at sunrise",
                              "Wildcard, anything — e.g. The rain stopped right before my commute",
                            ][i]
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <Label>Which one do you feel most, right now?</Label>
                    <Input
                      value={data.gratitude_felt_most}
                      onChange={(e) => setData({ ...data, gratitude_felt_most: e.target.value })}
                      placeholder="e.g. My sister calling — it reminded me I'm not doing this alone"
                      className="font-display text-base font-semibold"
                    />
                  </div>
                </div>
              )}

              {stepIndex === 4 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-teal"
                    icon={ListChecks}
                    title="CLEAR YOUR HEAD"
                    sub="Get every loose task out of your head and onto the list — the list holds it, so you don't have to."
                  />
                  {data.todo.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={t}
                        onChange={(e) => {
                          const next = [...data.todo];
                          next[i] = e.target.value;
                          setData({ ...data, todo: next });
                        }}
                        placeholder={i === 0 ? "e.g. Reply to Sam's email" : `To-do ${i + 1}`}
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setData({ ...data, todo: data.todo.filter((_, j) => j !== i) })}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setData({ ...data, todo: [...data.todo, ""] })}
                  >
                    + Add item
                  </Button>
                </div>
              )}

              {stepIndex === 5 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-forest"
                    icon={CalendarClock}
                    title="PLAN THE HOURS"
                    sub="Give the day real time slots — set a time and name what you'll do in it."
                  />
                  {data.schedule.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2.5">
                      <TimeWheel
                        value={s.time || "09:00"}
                        onChange={(v) => {
                          const next = [...data.schedule];
                          next[i] = { ...next[i], time: v };
                          setData({ ...data, schedule: next });
                        }}
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <Input
                          value={s.block}
                          onChange={(e) => {
                            const next = [...data.schedule];
                            next[i] = { ...next[i], block: e.target.value };
                            setData({ ...data, schedule: next });
                          }}
                          placeholder="e.g. Deep work — write the report"
                        />
                        {/* priority — same colors as the Schedule page, saved with the block so both stay in sync */}
                        <div className="flex flex-wrap gap-1.5">
                          {PRIORITIES.map((x) => {
                            const active = (s.priority ?? 2) === x.p;
                            return (
                              <button
                                key={x.p}
                                type="button"
                                onClick={() => {
                                  const next = [...data.schedule];
                                  next[i] = { ...next[i], priority: x.p };
                                  setData({ ...data, schedule: next });
                                }}
                                className={`prio-${x.p} inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                  active ? "prio-chip scale-105" : "bg-muted text-muted-foreground"
                                }`}
                                title={x.desc}
                              >
                                <span className="prio-dot size-1.5 rounded-full" />
                                {x.label}
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-end text-muted-foreground"
                          type="button"
                          onClick={() =>
                            setData({ ...data, schedule: data.schedule.filter((_, j) => j !== i) })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setData({ ...data, schedule: [...data.schedule, { time: "09:00", block: "", priority: 2 }] })
                    }
                  >
                    + Add block
                  </Button>
                </div>
              )}

              {isReview && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-sky"
                    icon={ScrollText}
                    title="REVIEW & LOCK IN"
                    sub="Leo reviews your plan, then you commit to it. Tonight you'll score how it went."
                  />
                  <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-primary/[0.03] p-4">
                    <CoachAvatar mood={loadingCritique ? "thinking" : "pushing"} size={40} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Leo&apos;s read on today&apos;s plan
                      </p>
                      {loadingCritique && (
                        <span className="mt-2 inline-flex gap-1">
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                              style={{ animationDelay: `${d * 0.15}s` }}
                            />
                          ))}
                        </span>
                      )}
                      {critique && (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{critique}</p>
                      )}
                      {critique && (
                        <LeoFollowup topic="this morning's plan and affirmation" seed={critique} />
                      )}
                    </div>
                  </div>
                  <Button className="h-12 w-full text-[15px] font-semibold" onClick={lockIn} disabled={loadingCritique || locking}>
                    {locking ? "Locking in..." : lockError ? "Try again" : "Lock it in"}
                  </Button>
                  {lockError && (
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-medium text-destructive">
                        Couldn&apos;t lock in — your plan is still here. Check your connection and tap Try again.
                      </p>
                      {lockErrorDetail && (
                        <p className="break-words text-[11px] font-normal text-muted-foreground">
                          {lockErrorDetail}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {!isReview && (
        <div className="mt-auto flex items-center gap-3 pt-2 lg:mt-0 lg:pt-0">
          <Button
            variant="outline"
            className="h-12 flex-1 border-primary/35 bg-card text-[15px] font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary lg:h-10 lg:flex-none lg:px-6 lg:text-sm"
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
          >
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button
            className="h-12 flex-[1.35] text-[15px] font-semibold lg:h-10 lg:flex-none lg:px-8 lg:text-sm"
            onClick={() => {
              if (stepIndex === STEP_TITLES.length - 2) {
                goToReview();
              } else {
                setStepIndex((i) => Math.min(i + 1, STEP_TITLES.length - 1));
              }
            }}
          >
            Next
          </Button>
        </div>
      )}
      {isReview && (
        <div className="mt-auto flex justify-start pt-2 lg:mt-0 lg:pt-0">
          <Button variant="outline" className="h-12 border-primary/35 bg-card px-6 text-[15px] font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary lg:h-10 lg:text-sm" onClick={() => { setStepIndex((i) => i - 1); setCritique(null); }}>
            <ChevronLeft className="size-4" /> Back to edit
          </Button>
        </div>
      )}
    </div>
  );
}
