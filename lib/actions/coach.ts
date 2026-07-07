"use server";

import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { coachDiscuss, type CoachChatMsg } from "@/lib/ai/coach";

export type { CoachChatMsg };

/** Generic Leo follow-up used across sections (goals, schedule). The section
    passes what it's about (`topic`) and Leo's first read (`seed`); Leo answers
    the running conversation. Nothing is persisted — the chat lives in the UI. */
export async function askLeoFollowUp(
  topic: string,
  seed: string,
  messages: CoachChatMsg[]
): Promise<string> {
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
  return coachDiscuss({ identity, profile, topic, seed, messages });
}
