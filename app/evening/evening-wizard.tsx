"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { submitEveningEntry, type EveningInput } from "@/lib/actions/evening";
import {
  EVENING_DIMENSIONS,
  emptyScorecard,
  scorecardAverage,
  scorecardVerdict,
} from "@/lib/evening-scorecard";
import { CoachAvatar } from "@/components/coach-avatar";
import { LeoFollowup } from "@/components/leo-followup";
import {
  Sparkles,
  MoonStar,
  ChevronLeft,
  Gauge,
  BookOpen,
  Wrench,
  BatteryLow,
  Trophy,
  Rocket,
  Heart,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@/components/close-button";

const EMPTY: EveningInput = {
  story_moment: "",
  mistakes: "",
  better_tomorrow: "",
  scorecard: emptyScorecard(),
  honest_readout: "",
  energy_leak: "",
  self_respect_score: 5,
  win: "",
  first_move: "",
  vision_felt_vividness: 6,
  vision_felt_note: "",
  gratitudes: ["", "", "", "", ""],
  gratitude_felt_most: "",
};

const STEP_TITLES = [
  "Story-Worthy Moment",
  "Learning & Mistakes",
  "Better Tomorrow",
  "Evening Scorecard — honest",
  "Energy Leak & Self-Respect Score",
  "One Win / Proof",
  "Tomorrow's 1st Move",
  "Feel It — Vision",
  "5 Gratitudes",
  "Review",
];

// Tap-to-start openers — drop the first words, finish in your own.
const STORY_STARTERS = ["Today I finally ", "The moment that stuck was ", "I felt proud when ", "The best part was "];
const FIRST_MOVE_STARTERS = ["Before I touch my phone, I'll ", "First thing tomorrow, I will ", "I'll start by "];

function StarterChips({ starters, onPick }: { starters: string[]; onPick: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {starters.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary/90 transition-colors hover:bg-primary/10"
        >
          <Plus className="size-3" /> {s.trim()}…
        </button>
      ))}
    </div>
  );
}

function selfRespectVerdict(score: number) {
  if (score <= 3) return { text: "Rough one. Name it, don't dress it up — tomorrow resets.", cls: "text-muted-foreground" };
  if (score <= 6) return { text: "Middling. You know exactly which hour cost you.", cls: "text-[var(--bronze)]" };
  if (score <= 8) return { text: "You kept most promises to yourself today.", cls: "text-primary" };
  return { text: "That's the person from the vision. Do it again tomorrow.", cls: "text-emerald" };
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
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold leading-none tracking-tight">{title}</p>
          <p className="mt-1 text-xs font-medium text-white/80">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function EveningWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<EveningInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ realization: string; manifestation: string } | null>(null);
  const [submitError, setSubmitError] = useState(false);

  const isReview = stepIndex === STEP_TITLES.length - 1;
  const progress = result ? 100 : ((stepIndex + 1) / STEP_TITLES.length) * 100;

  const isDirty =
    !result &&
    (data.story_moment.trim() !== "" ||
      data.mistakes.trim() !== "" ||
      data.better_tomorrow.trim() !== "" ||
      data.honest_readout.trim() !== "" ||
      data.energy_leak.trim() !== "" ||
      data.win.trim() !== "" ||
      data.first_move.trim() !== "" ||
      data.vision_felt_note.trim() !== "" ||
      data.gratitudes.some((g) => g.trim() !== "") ||
      data.gratitude_felt_most.trim() !== "");
  const LEAVE_WARNING = "Leave the evening journal? What you've written so far will be lost.";

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  async function submit() {
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await submitEveningEntry(data);
      setResult(res);
    } catch (e) {
      console.error("evening submit failed:", e);
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4 py-6 lg:p-6">
        <CloseButton />
        <div className="card-tint tint-teal corner-cut relative overflow-hidden p-6">
          <div className="relative flex items-center gap-4">
            <CoachAvatar mood="calm" size={64} className="shrink-0" />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MoonStar className="size-3.5" /> Realization dose
              </p>
              <h2 className="font-display text-xl font-semibold">Here&apos;s the honest read</h2>
            </div>
          </div>
          <p className="relative mt-4 whitespace-pre-wrap text-sm leading-relaxed">{result.realization}</p>
        </div>

        <div className="card-elevated relative overflow-hidden p-6">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> Visualize tomorrow&apos;s first move
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {result.manifestation}
          </p>
          <LeoFollowup topic="tonight's honest read on the day" seed={result.realization} />
        </div>

        <Button className="w-full" onClick={() => router.push("/")}>
          Close the day
        </Button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.9rem+env(safe-area-inset-top))] lg:justify-start lg:gap-6 lg:p-6 lg:pt-10">
      {/* header — step context + close, always in reach */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--navy)]">
              <MoonStar className="size-3.5" /> Evening Journal
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Step {stepIndex + 1} of {STEP_TITLES.length}
            </p>
            <p className="truncate font-display text-lg font-semibold leading-tight">
              {STEP_TITLES[stepIndex]}
            </p>
          </div>
          <CloseButton inline confirmMessage={isDirty ? LEAVE_WARNING : undefined} />
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
                    grad="solid-night"
                    icon={MoonStar}
                    title="TODAY'S BEST MOMENT"
                    sub="If today were one scene in your story, which moment would make the cut?"
                  />
                  <Textarea
                    rows={4}
                    value={data.story_moment}
                    onChange={(e) => setData({ ...data, story_moment: e.target.value })}
                    placeholder="e.g. I finally sent the email I'd been dreading for a week — and it felt lighter after."
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                  <StarterChips
                    starters={STORY_STARTERS}
                    onPick={(s) =>
                      setData({
                        ...data,
                        story_moment: data.story_moment.trim() ? `${data.story_moment.replace(/\s+$/, "")} ${s}` : s,
                      })
                    }
                  />
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-bronze"
                    icon={BookOpen}
                    title="WHAT TODAY TAUGHT YOU"
                    sub="Name one mistake or slip from today, and the lesson you're taking from it."
                  />
                  <Textarea
                    rows={4}
                    value={data.mistakes}
                    onChange={(e) => setData({ ...data, mistakes: e.target.value })}
                    placeholder="e.g. I checked my phone first thing and lost the morning — lesson: phone stays off until the first task is done."
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-teal"
                    icon={Wrench}
                    title="ONE FIX FOR TOMORROW"
                    sub="One small change that would make tomorrow run smoother. Small fixes add up."
                  />
                  <Textarea
                    rows={4}
                    value={data.better_tomorrow}
                    onChange={(e) => setData({ ...data, better_tomorrow: e.target.value })}
                    placeholder="e.g. Lay out my clothes and water tonight so the morning workout has no excuses."
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-coral"
                    icon={Gauge}
                    title="SCORE THE DAY HONESTLY"
                    sub="Rate each part of today as it really was — not as you wish it had gone."
                  />
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-3.5">
                    <p className="text-sm font-semibold">Tonight&apos;s average</p>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-3xl font-bold leading-none text-gradient">
                        {scorecardAverage(data.scorecard)}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">/ 10 avg</p>
                    </div>
                  </div>

                  {EVENING_DIMENSIONS.map((dim) => {
                    const val = data.scorecard[dim.key] ?? 5;
                    return (
                      <div key={dim.key} className={`card-tint ${dim.tint} corner-cut space-y-2.5 p-4`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${dim.grad} text-xs font-bold text-white`}>
                              <Gauge className="size-3.5" />
                            </span>
                            <div>
                              <Label className="text-sm font-semibold">{dim.label}</Label>
                              <p className="text-[11px] text-muted-foreground">{dim.hint}</p>
                            </div>
                          </div>
                          <span className="font-display text-lg font-bold tabular-nums">{val}</span>
                        </div>
                        <Slider
                          value={[val]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={(v) =>
                            setData({
                              ...data,
                              scorecard: {
                                ...data.scorecard,
                                [dim.key]: Array.isArray(v) ? v[0] : v,
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })}

                  <p className="text-center text-sm font-medium text-muted-foreground">
                    {scorecardVerdict(scorecardAverage(data.scorecard))}
                  </p>

                  <div className="card-elevated space-y-2 p-4">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="size-4 text-primary" /> One honest line — the plain truth about today, no spin
                    </Label>
                    <Textarea
                      rows={2}
                      value={data.honest_readout}
                      onChange={(e) => setData({ ...data, honest_readout: e.target.value })}
                      placeholder="e.g. I hid in busywork all afternoon because I was scared of the real task"
                    />
                  </div>
                </div>
              )}

              {stepIndex === 4 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-slate"
                    icon={BatteryLow}
                    title="WHERE ENERGY LEAKED"
                    sub="Where did your time or energy drain today? Point at the exact spot."
                  />
                  <Textarea
                    rows={3}
                    value={data.energy_leak}
                    onChange={(e) => setData({ ...data, energy_leak: e.target.value })}
                    placeholder="e.g. 45 minutes lost to Instagram after lunch when I should've started the report."
                    className="font-display text-base font-semibold leading-relaxed"
                  />
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label>Self-respect score for today</Label>
                      <span className="font-display text-lg font-bold tabular-nums text-primary">
                        {data.self_respect_score}/10
                      </span>
                    </div>
                    <Slider
                      value={[data.self_respect_score]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) =>
                        setData({ ...data, self_respect_score: Array.isArray(v) ? v[0] : v })
                      }
                    />
                    <p className={`text-xs font-semibold ${selfRespectVerdict(data.self_respect_score).cls}`}>
                      {selfRespectVerdict(data.self_respect_score).text}
                    </p>
                  </div>
                </div>
              )}

              {stepIndex === 5 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-emerald"
                    icon={Trophy}
                    title="ONE REAL WIN"
                    sub="One thing you actually got done today — proof the day counted."
                  />
                  <Textarea
                    rows={3}
                    value={data.win}
                    onChange={(e) => setData({ ...data, win: e.target.value })}
                    placeholder="e.g. Today I actually finished the first draft instead of just planning it."
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 6 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-blue"
                    icon={Rocket}
                    title="TOMORROW'S FIRST MOVE"
                    sub="Decide the very first thing you'll do tomorrow, so morning-you just acts."
                  />
                  <Textarea
                    rows={3}
                    value={data.first_move}
                    onChange={(e) => setData({ ...data, first_move: e.target.value })}
                    placeholder="e.g. Open the doc and write one paragraph before touching my phone."
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                  <StarterChips
                    starters={FIRST_MOVE_STARTERS}
                    onPick={(s) =>
                      setData({
                        ...data,
                        first_move: data.first_move.trim() ? `${data.first_move.replace(/\s+$/, "")} ${s}` : s,
                      })
                    }
                  />
                </div>
              )}

              {stepIndex === 7 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-rose"
                    icon={Sparkles}
                    title="PICTURE IT LANDING"
                    sub="Close your eyes, imagine tomorrow's first move going well, then note how it felt."
                  />
                  {data.first_move.trim() && (
                    <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm font-medium italic">
                      &ldquo;{data.first_move.trim()}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Optional — leave it blank to skip.
                  </p>
                  <div className="card-tint tint-coral corner-cut space-y-2 p-4">
                    <Label className="text-sm font-semibold">
                      How real did that feel? ({data.vision_felt_vividness}/10)
                    </Label>
                    <Slider
                      value={[data.vision_felt_vividness]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) =>
                        setData({ ...data, vision_felt_vividness: Array.isArray(v) ? v[0] : v })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>What did you notice in your body or mood?</Label>
                    <Textarea
                      rows={3}
                      value={data.vision_felt_note}
                      onChange={(e) => setData({ ...data, vision_felt_note: e.target.value })}
                      placeholder="e.g. calm settled in my chest, felt ready instead of anxious"
                    />
                  </div>
                </div>
              )}

              {stepIndex === 8 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-emerald"
                    icon={Heart}
                    title="END ON GRATITUDE"
                    sub="Name five good things from today you're grateful for. Small ones count."
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
                              "Something that went right — e.g. The meeting landed better than I feared",
                              "A person you're thankful for — e.g. A friend texted me out of nowhere",
                              "A small moment — e.g. Ten quiet minutes with tea before bed",
                              "Something about your body or health — e.g. My back felt good on the walk",
                              "Anything at all — e.g. The rain held off until I got home",
                            ][i]
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <Label>Which one do you feel most right now?</Label>
                    <Input
                      value={data.gratitude_felt_most}
                      onChange={(e) => setData({ ...data, gratitude_felt_most: e.target.value })}
                      placeholder="e.g. The friend texting — it reminded me people have my back"
                      className="font-display text-base font-semibold"
                    />
                  </div>
                </div>
              )}

              {isReview && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-night"
                    icon={MoonStar}
                    title="SEAL THE DAY"
                    sub="Leo cross-checks tonight against your check-ins and patterns, then hands back the honest read."
                  />
                  <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-primary/[0.03] p-4">
                    <CoachAvatar mood="calm" size={40} className="shrink-0" />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Submit and you get tonight&apos;s realization dose plus a guided visualization of
                      tomorrow&apos;s first move.
                    </p>
                  </div>
                  <Button className="h-12 w-full text-[15px] font-semibold" onClick={submit} disabled={submitting}>
                    {submitting ? "Reflecting..." : submitError ? "Try again" : "Submit tonight's entry"}
                  </Button>
                  {submitError && (
                    <p className="text-center text-sm font-medium text-destructive">
                      Couldn&apos;t submit — your writing is still here. Check your connection and tap Try again.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto flex items-center gap-3 pt-2 lg:mt-0 lg:pt-0">
        <Button
          variant="outline"
          className="h-12 flex-1 border-primary/35 bg-card text-[15px] font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary lg:h-10 lg:flex-none lg:px-6 lg:text-sm"
          onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
          disabled={stepIndex === 0}
        >
          <ChevronLeft className="size-4" /> Back
        </Button>
        {!isReview && (
          <Button
            className="h-12 flex-[1.35] text-[15px] font-semibold lg:h-10 lg:flex-none lg:px-8 lg:text-sm"
            onClick={() => setStepIndex((i) => Math.min(i + 1, STEP_TITLES.length - 1))}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
