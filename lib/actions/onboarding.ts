"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";

export type IdentityRow = {
  id: string;
  vision_3_year: string | null;
  vision_1_year: string | null;
  future_identity_traits: string | null;
  future_identity_behaviors: string | null;
};

export type ProfileRow = {
  id: string;
  who_you_are_now: string | null;
  strengths: string | null;
  weaknesses: string | null;
  past_patterns: string | null;
  motivation: string | null;
  fears: string | null;
  capacity_check: string | null;
  energy_pattern: string | null;
  feedback_style: string | null;
};

export async function getIdentity(): Promise<IdentityRow | null> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("identity")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getProfile(): Promise<ProfileRow | null> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function hasCompletedOnboarding() {
  const identity = await getIdentity();
  return Boolean(identity?.vision_1_year && identity?.future_identity_traits);
}

export type OnboardingInput = {
  who_you_are_now: string;
  strengths: string;
  weaknesses: string;
  past_patterns: string;
  vision_3_year: string;
  vision_1_year: string;
  future_identity_traits: string;
  future_identity_behaviors: string;
  motivation: string;
  fears: string;
  capacity_check: string;
  energy_pattern: string;
  feedback_style: string;
};

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitOnboarding(input: OnboardingInput): Promise<SubmitResult> {
  const userId = await getUserId();
  const supabase = createServerClient();

  const existingIdentity = await getIdentity();
  const existingProfile = await getProfile();

  const identityPayload = {
    vision_3_year: input.vision_3_year,
    vision_1_year: input.vision_1_year,
    future_identity_traits: input.future_identity_traits,
    future_identity_behaviors: input.future_identity_behaviors,
    updated_at: new Date().toISOString(),
  };

  // Check the DB result — Supabase returns { error }, it does NOT throw. Without
  // this, a failed save (e.g. FK violation from a stale session) looked like a
  // success and bounced the user back to onboarding, or hung on "Saving...".
  const identityRes = existingIdentity
    ? await supabase.from("identity").update(identityPayload).eq("id", existingIdentity.id)
    : await supabase.from("identity").insert({ ...identityPayload, user_id: userId });
  if (identityRes.error) return { ok: false, error: identityRes.error.message };

  const profilePayload = {
    who_you_are_now: input.who_you_are_now,
    strengths: input.strengths,
    weaknesses: input.weaknesses,
    past_patterns: input.past_patterns,
    motivation: input.motivation,
    fears: input.fears,
    capacity_check: input.capacity_check,
    energy_pattern: input.energy_pattern,
    feedback_style: input.feedback_style,
    updated_at: new Date().toISOString(),
  };

  const profileRes = existingProfile
    ? await supabase.from("profile").update(profilePayload).eq("id", existingProfile.id)
    : await supabase.from("profile").insert({ ...profilePayload, user_id: userId });
  if (profileRes.error) return { ok: false, error: profileRes.error.message };

  // No redirect here — the client navigates after this resolves so the
  // transition can't swallow the redirect and bounce back to onboarding.
  return { ok: true };
}
