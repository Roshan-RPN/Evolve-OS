import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { OnboardingWizard } from "./onboarding-wizard";
import { getIdentity, getProfile, type OnboardingInput } from "@/lib/actions/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // First-run users have nowhere to go back to (home redirects here);
  // returning users arrive from Profile and need a way out — with their
  // saved answers loaded so they can review and edit, not retype.
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
  const onboarded = Boolean(identity?.vision_1_year && identity?.future_identity_traits);

  const initial: Partial<OnboardingInput> = {
    who_you_are_now: profile?.who_you_are_now ?? "",
    strengths: profile?.strengths ?? "",
    weaknesses: profile?.weaknesses ?? "",
    past_patterns: profile?.past_patterns ?? "",
    vision_3_year: identity?.vision_3_year ?? "",
    vision_1_year: identity?.vision_1_year ?? "",
    future_identity_traits: identity?.future_identity_traits ?? "",
    future_identity_behaviors: identity?.future_identity_behaviors ?? "",
    motivation: profile?.motivation ?? "",
    fears: profile?.fears ?? "",
    capacity_check: profile?.capacity_check ?? "",
    energy_pattern: profile?.energy_pattern ?? "",
    feedback_style: profile?.feedback_style ?? "",
  };

  return (
    <div className="bg-app min-h-screen">
      {onboarded && (
        <div className="mx-auto w-full max-w-xl px-4 pt-[calc(0.9rem+env(safe-area-inset-top))] lg:px-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10"
          >
            <ChevronLeft className="size-4" /> Back to profile
          </Link>
        </div>
      )}
      <OnboardingWizard initial={initial} />
    </div>
  );
}
