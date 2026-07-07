"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  submitAfternoonEntry,
  type AfternoonInput,
  type PriorityStatus,
} from "@/lib/actions/afternoon";
import { CoachAvatar } from "@/components/coach-avatar";
import {
  Sparkles,
  Sun,
  ChevronLeft,
  Gauge,
  ListChecks,
  Compass,
  Crosshair,
  Zap,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Circle,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@/components/close-button";

const STEP_TITLES = [
  "Midday Pulse",
  "Priority Progress",
  "What Pulled You Off",
  "Refocus Before Evening",
  "Reset",
];

const ENERGY = [
  { key: "wired", label: "Wired", hint: "buzzing, hard to settle" },
  { key: "steady", label: "Steady", hint: "in the zone" },
  { key: "foggy", label: "Foggy", hint: "scattered, unfocused" },
  { key: "drained", label: "Drained", hint: "running on empty" },
];

const STATUSES: {
  key: PriorityStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  cls: string;
}[] = [
  { key: "done", label: "Done", icon: CheckCircle2, cls: "text-emerald border-emerald/50 bg-emerald/10" },
  { key: "moving", label: "Moving", icon: CircleDashed, cls: "text-primary border-primary/50 bg-primary/10" },
  { key: "stalled", label: "Stalled", icon: CircleSlash, cls: "text-[var(--coral)] border-[var(--coral)]/50 bg-[var(--coral)]/10" },
  { key: "untouched", label: "Not yet", icon: Circle, cls: "text-muted-foreground border-border bg-muted/40" },
];

// Tap-to-start openers — drop the first words, finish in your own.
const DRIFT_STARTERS = ["I lost time to ", "I kept avoiding ", "I got pulled into ", "The morning went sideways when "];
const REFOCUS_STARTERS = ["Before evening, I will ", "The one thing left is ", "I'll reset by "];

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

function onTrackVerdict(score: number) {
  if (score <= 3) return { text: "Day's slipping. Good you caught it now — half of it's still yours.", cls: "text-[var(--coral)]" };
  if (score <= 6) return { text: "Drifting a little. One clean move resets the whole afternoon.", cls: "text-[var(--bronze)]" };
  if (score <= 8) return { text: "Mostly on it. Protect the momentum, don't coast.", cls: "text-primary" };
  return { text: "Locked in. Keep the exact same standard till tonight.", cls: "text-emerald" };
}

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

export function AfternoonWizard({
  priorities,
  planLocked,
}: {
  priorities: string[];
  planLocked: boolean;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<AfternoonInput>({
    on_track_score: 6,
    energy: "",
    priority_progress: priorities.map((priority) => ({ priority, status: "untouched" as PriorityStatus })),
    drift: "",
    honest_line: "",
    refocus: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ nudge: string } | null>(null);

  const isReview = stepIndex === STEP_TITLES.length - 1;
  const progress = result ? 100 : ((stepIndex + 1) / STEP_TITLES.length) * 100;

  function setStatus(index: number, status: PriorityStatus) {
    setData((d) => ({
      ...d,
      priority_progress: d.priority_progress.map((p, i) => (i === index ? { ...p, status } : p)),
    }));
  }

  async function submit() {
    setSubmitting(true);
    const res = await submitAfternoonEntry(data);
    setResult(res);
    setSubmitting(false);
  }

  if (result) {
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4 py-6 lg:p-6">
        <CloseButton />
        <div className="card-tint tint-amber corner-cut relative overflow-hidden p-6">
          <div className="relative flex items-center gap-4">
            <CoachAvatar mood="pushing" size={64} className="shrink-0" />
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sun className="size-3.5" /> Midday recalibration
              </p>
              <h2 className="font-display text-xl font-semibold">Reset — half the day is still yours</h2>
            </div>
          </div>
          <p className="relative mt-4 whitespace-pre-wrap text-sm leading-relaxed">{result.nudge}</p>
        </div>

        {data.refocus.trim() && (
          <div className="card-elevated relative overflow-hidden p-6">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Crosshair className="size-4 text-primary" /> Nail this before evening
            </p>
            <p className="whitespace-pre-wrap font-display text-base font-semibold leading-relaxed">
              {data.refocus.trim()}
            </p>
          </div>
        )}

        <Button className="w-full" onClick={() => router.push("/")}>
          Back to the day
        </Button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.9rem+env(safe-area-inset-top))] lg:justify-start lg:gap-6 lg:p-6 lg:pt-10">
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

      <div className="flex flex-1 flex-col justify-center lg:flex-none lg:justify-start">
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
                    grad="solid-blue"
                    icon={Gauge}
                    title="HALFTIME READ"
                    sub="No spin. How on-track is the day actually running right now?"
                  />
                  <div className="card-tint tint-blue corner-cut space-y-2.5 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label className="text-sm font-semibold">On-track right now</Label>
                      <span className="font-display text-lg font-bold tabular-nums text-primary">
                        {data.on_track_score}/10
                      </span>
                    </div>
                    <Slider
                      value={[data.on_track_score]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) =>
                        setData({ ...data, on_track_score: Array.isArray(v) ? v[0] : v })
                      }
                    />
                    <p className={`text-xs font-semibold ${onTrackVerdict(data.on_track_score).cls}`}>
                      {onTrackVerdict(data.on_track_score).text}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      <Zap className="size-4 text-primary" /> Energy right now
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ENERGY.map((e) => {
                        const active = data.energy === e.key;
                        return (
                          <button
                            key={e.key}
                            type="button"
                            onClick={() => setData({ ...data, energy: e.key })}
                            className={`rounded-2xl border p-3 text-left transition-colors ${
                              active
                                ? "border-primary bg-primary/10"
                                : "border-border bg-muted/40 hover:bg-muted"
                            }`}
                          >
                            <p className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{e.label}</p>
                            <p className="text-[11px] text-muted-foreground">{e.hint}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-teal"
                    icon={ListChecks}
                    title="WHERE THEY STAND"
                    sub="Mark each priority honestly — this is what Leo checks the rest against."
                  />
                  {data.priority_progress.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {planLocked
                        ? "No top priorities on today's plan. You can still reset below — just be honest about what you've actually moved."
                        : "You haven't locked a morning plan yet, so there are no priorities to track. Do the morning journal first, or reset on feel below."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.priority_progress.map((p, i) => (
                        <div key={i} className="card-tint tint-teal corner-cut space-y-2.5 p-4">
                          <p className="font-display text-sm font-semibold leading-snug">{p.priority}</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {STATUSES.map((s) => {
                              const active = p.status === s.key;
                              const Icon = s.icon;
                              return (
                                <button
                                  key={s.key}
                                  type="button"
                                  onClick={() => setStatus(i, s.key)}
                                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition-colors ${
                                    active ? s.cls : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  <Icon className="size-4" />
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {stepIndex === 2 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-coral"
                    icon={Compass}
                    title="NAME THE DRIFT"
                    sub="If the morning didn't go to plan — what actually pulled you off? Be specific."
                  />
                  <Textarea
                    rows={3}
                    value={data.drift}
                    onChange={(e) => setData({ ...data, drift: e.target.value })}
                    placeholder="e.g. I fell into the scroll hole after lunch and dodged the report."
                    className="font-display text-base font-semibold leading-relaxed"
                  />
                  <StarterChips
                    starters={DRIFT_STARTERS}
                    onPick={(s) =>
                      setData({ ...data, drift: data.drift.trim() ? `${data.drift.replace(/\s+$/, "")} ${s}` : s })
                    }
                  />
                  <div className="card-elevated space-y-2 p-4">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="size-4 text-primary" /> One honest line about the morning
                    </Label>
                    <Textarea
                      rows={2}
                      value={data.honest_line}
                      onChange={(e) => setData({ ...data, honest_line: e.target.value })}
                      placeholder="e.g. I stayed busy but avoided the one thing that actually matters"
                    />
                  </div>
                </div>
              )}

              {stepIndex === 3 && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-emerald"
                    icon={Crosshair}
                    title="ONE THING"
                    sub="Pick the single thing that would make the rest of today count. Just one."
                  />
                  <Textarea
                    rows={3}
                    value={data.refocus}
                    onChange={(e) => setData({ ...data, refocus: e.target.value })}
                    placeholder="e.g. Before evening, I will finish the report's first section."
                    className="min-h-28 font-display text-base font-semibold leading-relaxed"
                  />
                  <StarterChips
                    starters={REFOCUS_STARTERS}
                    onPick={(s) =>
                      setData({ ...data, refocus: data.refocus.trim() ? `${data.refocus.replace(/\s+$/, "")} ${s}` : s })
                    }
                  />
                </div>
              )}

              {isReview && (
                <div className="space-y-4">
                  <StepHero
                    grad="solid-slate"
                    icon={Sun}
                    title="RESET & GO"
                    sub="Leo reads your midday state against your check-ins and hands back the course-correction."
                  />
                  <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-primary/[0.03] p-4">
                    <CoachAvatar mood="pushing" size={40} className="shrink-0" />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Submit and you get a short midday recalibration — what to unstick and the one move for
                      the next 30 minutes.
                    </p>
                  </div>
                  <Button className="h-12 w-full text-[15px] font-semibold" onClick={submit} disabled={submitting}>
                    {submitting ? "Recalibrating..." : "Get my midday reset"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      </div>

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
