"use server";

import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { coachDiscuss, type CoachChatMsg } from "@/lib/ai/coach";

// NOTE: a "use server" file may export ONLY async functions. Re-exporting a type
// here (`export type { CoachChatMsg }`) makes Turbopack emit a runtime reference
// to the erased type -> `ReferenceError: CoachChatMsg is not defined` at module
// eval, which 500s every route that imports this chain (e.g. POST /morning).
// Consumers import the type straight from "@/lib/ai/coach" instead.

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
