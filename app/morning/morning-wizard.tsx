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
const AFFIRMATION_SPARKS = [
  "I am someone who keeps promises to myself",
  "I move before I feel ready",
  "I do the hard thing first",
  "Discipline is my default, not my mood",
  "I am building something bigger than today",
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
    <div className={`corner-cut relative overflow-hidden ${grad} p-5 text-white`}>
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
  const [story, setStory] = useState<string | null>(null);

  const isReview = stepIndex === STEP_TITLES.length - 1;
  const progress = story ? 100 : ((stepIndex + 1) / STEP_TITLES.length) * 100;

  async function goToReview() {
    setStepIndex(STEP_TITLES.length - 1);
    if (critique || loadingCritique) return;
    setLoadingCritique(true);
    const result = await critiqueDraftPlan({
      top_priorities: data.top_priorities,
      todo: data.todo.filter(Boolean),
      schedule: data.schedule.filter((s) => s.time || s.block),
    });
    setCritique(result);
    setLoadingCritique(false);
  }

  async function lockIn() {
    setLocking(true);
    const result = await submitMorningEntry({
      ...data,
      todo: data.todo.filter(Boolean),
      schedule: data.schedule.filter((s) => s.time || s.block),
    });
    setStory(result.story);
    setLocking(false);
  }

  if (story) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-6 lg:p-6">
        <CloseButton />
        <div className="card-tint tint-coral corner-cut relative overflow-hidden p-6">
          <div className="relative flex items-center gap-4">
            <CoachAvatar mood="pushing" size={64} className="shrink-0" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Before you go</p>
              <h2 className="font-display text-xl font-semibold">Carry this into the day</h2>
            </div>
          </div>
          <p className="relative mt-4 whitespace-pre-wrap text-sm leading-relaxed">{story}</p>
          <div className="relative mt-5 flex gap-2">
            <Button
              variant="outline"
              className="border-primary/35 bg-card font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary"
              onClick={() => { setStory(null); setStepIndex(STEP_TITLES.length - 1); }}
            >
              <ChevronLeft className="size-4" /> Back
            </Button>
            <Button className="flex-1" onClick={() => router.push("/")}>
              Start the day
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.9rem+env(safe-area-inset-top))] lg:justify-start lg:gap-6 lg:p-6 lg:pt-10">
      {/* header — step context + close, always in reach */}
      <div className="space-y-2.5">
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
                <div className="space-y-4">
                  <StepHero
                    grad="solid-coral"
                    icon={Sunrise}
                    title="I AM…"
                    sub="Say it like it's already true. Then go prove it by tonight."
                  />

                  <Textarea
                    rows={4}
                    value={data.affirmations}
                    onChange={(e) => setData({ ...data, affirmations: e.target.value })}
                    placeholder="I am the kind of person who…"
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />

                  {/* One-tap sparks — kill the blank page */}
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
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                      >
                        <Plus className="size-3" /> {s}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
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
                    title="CHECK THE ENGINE"
                    sub="Name the feeling — feelings you name stop driving the day."
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
                      <Label>How much fuel is in the tank?</Label>
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
                    title="PICK YOUR 3 BATTLES"
                    sub="If only three things happen today, make it these three."
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
                            ["The one that must happen, no matter what", "The one that moves the vision", "The one you keep avoiding"][i]
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
                    title="ALREADY RICH"
                    sub="Five things that are already good — small counts double."
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
                            ["A person", "A thing your body did", "Something you'd miss if it vanished", "A small comfort from yesterday", "Wildcard — anything"][i]
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
                      placeholder="Paste or paraphrase the one that lands"
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
                    title="EMPTY THE HEAD"
                    sub="Everything circling up there goes on the list — the list carries it, not you."
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
                        placeholder={`To-do ${i + 1}`}
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
                    title="OWN THE CLOCK"
                    sub="A day without time slots is a wish. Spin the time and name the block."
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
                          placeholder="Deep work block"
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
                    title="THE CONTRACT"
                    sub="Leo reads the plan, then you sign it. Tonight scores it."
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
                    </div>
                  </div>
                  <Button className="h-12 w-full text-[15px] font-semibold" onClick={lockIn} disabled={loadingCritique || locking}>
                    {locking ? "Locking in..." : "Lock it in"}
                  </Button>
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
