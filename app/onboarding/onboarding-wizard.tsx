"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UserRound,
  Scale,
  Mountain,
  Target,
  Sparkles,
  Flame,
  Gauge,
  Compass,
} from "lucide-react";
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

// Per-step hero — flat solid colour + icon, same premium banner as the
// morning / evening rituals. No gradients, no tinted card washes.
const STEP_META = [
  { grad: "grad-blue", icon: UserRound },
  { grad: "grad-indigo", icon: Scale },
  { grad: "grad-violet", icon: Mountain },
  { grad: "grad-teal", icon: Target },
  { grad: "grad-emerald", icon: Sparkles },
  { grad: "grad-coral", icon: Flame },
  { grad: "grad-rose", icon: Gauge },
  { grad: "grad-bronze", icon: Compass },
] as const;

/* One flat confident colour, icon chip, punchy title — matches StepHero
   in the morning wizard so the whole app reads as one premium surface. */
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
          <p className="font-display text-xl font-extrabold leading-tight tracking-tight">{title}</p>
          <p className="mt-1 text-xs font-medium text-white/85">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWizard({ initial }: { initial?: Partial<OnboardingInput> }) {
  const [stepIndex, setStepIndex] = useState(0);
  // Returning users see their saved answers and can edit them; submit re-upserts.
  const [data, setData] = useState<OnboardingInput>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const meta = STEP_META[stepIndex % STEP_META.length];
  const isLast = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canAdvance = step.fields.every((f) => data[f.key].trim().length > 0);

  function update(key: keyof OnboardingInput, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function next() {
    if (isLast) {
      setSaving(true);
      let result;
      try {
        result = await submitOnboarding(data);
      } catch {
        // Network / server crash — un-stick the button and tell the user.
        toast.error("Could not save. Check your connection and try again.");
        setSaving(false);
        return;
      }
      if (!result.ok) {
        toast.error(result.error || "Could not save your answers. Try again.");
        setSaving(false);
        return;
      }
      // Saved — hard navigation to home. A soft router.replace()+refresh() could
      // stall mid-transition (button stuck on "Saving...", home never mounts),
      // especially in the installed PWA. A full document load guarantees home
      // renders fresh with the just-saved state. Keep `saving` true so the button
      // stays disabled through the reload.
      window.location.replace("/");
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
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
              <StepHero grad={meta.grad} icon={meta.icon} title={step.title} sub={step.description} />
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
          disabled={stepIndex === 0 || saving}
        >
          Back
        </Button>
        <Button
          className="h-12 flex-1 text-[15px] font-semibold lg:h-10 lg:flex-none lg:px-8 lg:text-sm"
          onClick={next}
          disabled={!canAdvance || saving}
        >
          {isLast ? (saving ? "Saving..." : "Finish") : "Next"}
        </Button>
      </div>
    </div>
  );
}
