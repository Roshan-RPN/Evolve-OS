"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  "Review",
];

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

  const isReview = stepIndex === STEP_TITLES.length - 1;
  const progress = result ? 100 : ((stepIndex + 1) / STEP_TITLES.length) * 100;

  async function submit() {
    setSubmitting(true);
    const res = await submitEveningEntry(data);
    setResult(res);
    setSubmitting(false);
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
                    grad="solid-night"
                    icon={MoonStar}
                    title="TODAY'S HEADLINE"
                    sub="If today were one scene in your story — which moment makes the cut?"
                  />
                  <Textarea
                    rows={4}
                    value={data.story_moment}
                    onChange={(e) => setData({ ...data, story_moment: e.target.value })}
                    placeholder="The moment worth retelling…"
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-bronze"
                    icon={BookOpen}
                    title="THE LESSON FEE"
                    sub="Mistakes are tuition. What did today charge you — and what did you get for it?"
                  />
                  <Textarea
                    rows={4}
                    value={data.mistakes}
                    onChange={(e) => setData({ ...data, mistakes: e.target.value })}
                    placeholder="Where I slipped, and what it taught me…"
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-teal"
                    icon={Wrench}
                    title="PATCH NOTES"
                    sub="One fix that makes tomorrow run 1% smoother. Small patches compound."
                  />
                  <Textarea
                    rows={4}
                    value={data.better_tomorrow}
                    onChange={(e) => setData({ ...data, better_tomorrow: e.target.value })}
                    placeholder="Tomorrow gets better if I…"
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-coral"
                    icon={Gauge}
                    title="NO ROUNDING UP"
                    sub="Score the day straight — the honest read, not the story you wish were true."
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
                      <Sparkles className="size-4 text-primary" /> One honest line — the hit-in-the-head truth about today
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
                    title="FIND THE LEAK"
                    sub="Energy doesn't vanish — it leaks somewhere specific. Point at it."
                  />
                  <Textarea
                    rows={3}
                    value={data.energy_leak}
                    onChange={(e) => setData({ ...data, energy_leak: e.target.value })}
                    placeholder="The scroll hole, the dread task, the person, the snack spiral…"
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
                    title="PROOF OF WORK"
                    sub="One win that proves today counted — evidence, not vibes."
                  />
                  <Textarea
                    rows={3}
                    value={data.win}
                    onChange={(e) => setData({ ...data, win: e.target.value })}
                    placeholder="Today I actually…"
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 6 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-blue"
                    icon={Rocket}
                    title="TOMORROW STARTS TONIGHT"
                    sub="Decide the first domino now — morning-you just executes."
                  />
                  <Textarea
                    rows={3}
                    value={data.first_move}
                    onChange={(e) => setData({ ...data, first_move: e.target.value })}
                    placeholder="The one concrete thing I do first tomorrow…"
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                </div>
              )}

              {stepIndex === 7 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-rose"
                    icon={Sparkles}
                    title="FEEL IT REAL"
                    sub="Close your eyes. Run the movie of tomorrow's first move — then read back how it landed."
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
                    {submitting ? "Reflecting..." : "Submit tonight's entry"}
                  </Button>
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
