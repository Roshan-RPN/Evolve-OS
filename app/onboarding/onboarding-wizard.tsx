"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitOnboarding, type OnboardingInput } from "@/lib/actions/onboarding";

type Field = { key: keyof OnboardingInput; label: string; placeholder: string };
type Step = { title: string; description: string; fields: Field[] };

const STEPS: Step[] = [
  {
    title: "Who you are right now",
    description: "No filtering. Just the current picture.",
    fields: [
      {
        key: "who_you_are_now",
        label: "Life stage, work/income situation, living situation, relationships, health",
        placeholder: "e.g. 24, running a small agency solo, live with family, single, sleep is inconsistent...",
      },
    ],
  },
  {
    title: "Strengths & weaknesses",
    description: "Be honest, not humble.",
    fields: [
      { key: "strengths", label: "What are you already good at?", placeholder: "..." },
      { key: "weaknesses", label: "What do you consistently struggle with?", placeholder: "..." },
      {
        key: "past_patterns",
        label: "Past pattern: what's made you quit or not follow through before?",
        placeholder: "...",
      },
    ],
  },
  {
    title: "3-year vision",
    description: "Career/business, health, relationships, finances, lifestyle.",
    fields: [
      {
        key: "vision_3_year",
        label: "Where is your life in 3 years if this goes right?",
        placeholder: "...",
      },
    ],
  },
  {
    title: "1-year vision",
    description: "The concrete proof you're on track for the 3-year picture.",
    fields: [
      {
        key: "vision_1_year",
        label: "What specifically has to be true 1 year from now?",
        placeholder: "...",
      },
    ],
  },
  {
    title: "Future identity",
    description: "Who you have to become, not just what you have to do.",
    fields: [
      {
        key: "future_identity_traits",
        label: "Traits and standards of that person",
        placeholder: "e.g. disciplined, shows up even when unmotivated, protects mornings...",
      },
      {
        key: "future_identity_behaviors",
        label: "The specific daily/weekly behaviors that person runs, that current-you doesn't",
        placeholder: "...",
      },
    ],
  },
  {
    title: "Motivation & fears",
    description: "The real reason this matters.",
    fields: [
      { key: "motivation", label: "Why does this actually matter to you?", placeholder: "..." },
      {
        key: "fears",
        label: "What are you most afraid happens if nothing changes?",
        placeholder: "...",
      },
    ],
  },
  {
    title: "Capacity check",
    description: "Everything already competing for your time and energy — so plans get built realistic, not stacked.",
    fields: [
      {
        key: "capacity_check",
        label: "Work, gym, content, outreach, relationships, everything currently on your plate",
        placeholder: "...",
      },
    ],
  },
  {
    title: "Working style",
    description: "So feedback actually lands instead of getting tuned out.",
    fields: [
      {
        key: "energy_pattern",
        label: "When is your energy naturally highest / lowest during the day?",
        placeholder: "...",
      },
      {
        key: "feedback_style",
        label: "What kind of feedback actually lands with you vs. what do you tune out?",
        placeholder: "e.g. I need it blunt and specific, vague encouragement does nothing for me...",
      },
    ],
  },
];

const EMPTY: OnboardingInput = {
  who_you_are_now: "",
  strengths: "",
  weaknesses: "",
  past_patterns: "",
  vision_3_year: "",
  vision_1_year: "",
  future_identity_traits: "",
  future_identity_behaviors: "",
  motivation: "",
  fears: "",
  capacity_check: "",
  energy_pattern: "",
  feedback_style: "",
};

// Per-step accent — walks the palette so the wizard feels alive, not one flat blue.
const STEP_ACCENTS = [
  { grad: "grad-blue", tint: "tint-blue" },
  { grad: "grad-indigo", tint: "tint-indigo" },
  { grad: "grad-violet", tint: "tint-violet" },
  { grad: "grad-teal", tint: "tint-teal" },
  { grad: "grad-emerald", tint: "tint-emerald" },
  { grad: "grad-coral", tint: "tint-coral" },
  { grad: "grad-rose", tint: "tint-rose" },
  { grad: "grad-amber", tint: "tint-amber" },
] as const;

export function OnboardingWizard({ initial }: { initial?: Partial<OnboardingInput> }) {
  const [stepIndex, setStepIndex] = useState(0);
  // Returning users see their saved answers and can edit them; submit re-upserts.
  const [data, setData] = useState<OnboardingInput>({ ...EMPTY, ...initial });
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const accent = STEP_ACCENTS[stepIndex % STEP_ACCENTS.length];
  const isLast = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canAdvance = step.fields.every((f) => data[f.key].trim().length > 0);

  function update(key: keyof OnboardingInput, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (isLast) {
      startTransition(() => submitOnboarding(data));
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.9rem+env(safe-area-inset-top))] lg:justify-center lg:gap-6 lg:p-6">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${accent.grad} text-sm font-bold text-white shadow-md`}>
            {stepIndex + 1}
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
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
          <Card className={`card-tint ${accent.tint} overflow-hidden border-0 shadow-xl`}>
            <div className={`-mt-4 h-1.5 w-full ${accent.grad}`} />
            <CardHeader>
              <CardTitle className="font-display text-xl">{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {step.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Textarea
                    id={field.key}
                    value={data[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto flex items-center gap-3 pt-2 lg:mt-0 lg:pt-0">
        <Button
          variant="outline"
          className="h-12 border-primary/35 bg-card px-5 font-semibold text-primary shadow-sm hover:bg-primary/10 hover:text-primary lg:h-10"
          onClick={back}
          disabled={stepIndex === 0 || pending}
        >
          Back
        </Button>
        <Button
          className="h-12 flex-1 text-[15px] font-semibold lg:h-10 lg:flex-none lg:px-8 lg:text-sm"
          onClick={next}
          disabled={!canAdvance || pending}
        >
          {isLast ? (pending ? "Saving..." : "Finish") : "Next"}
        </Button>
      </div>
    </div>
  );
}
