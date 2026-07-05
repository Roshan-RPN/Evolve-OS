"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { untangleConfusion, untangleFollowUp } from "@/lib/ai/coach";
import { revalidatePath } from "next/cache";

export type ThoughtKind = "confusion" | "idea" | "note";

export type Thought = {
  id: string;
  date: string;
  kind: ThoughtKind;
  content: string;
  ai_response: string | null;
  resolved: boolean;
  created_at: string;
};

export async function getThoughts(limit = 40): Promise<Thought[]> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("thoughts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Thought[]) ?? [];
}

export async function getOpenLoopsCount(): Promise<number> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { count } = await supabase
    .from("thoughts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "confusion")
    .eq("resolved", false);
  return count ?? 0;
}

export async function dumpThought(content: string, kind: ThoughtKind = "confusion"): Promise<Thought> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const clean = content.trim();
  if (!clean) throw new Error("Empty thought");

  // Pull recent dumps for pattern context (exclude the one we're about to add).
  const { data: recent } = await supabase
    .from("thoughts")
    .select("content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  let aiResponse: string | null = null;
  if (kind === "confusion") {
    const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
    aiResponse = await untangleConfusion({
      identity,
      profile,
      recentThoughts: (recent as { content: string; created_at?: string }[]) ?? [],
      content: clean,
    });
  }

  const { data, error } = await supabase
    .from("thoughts")
    .insert({ user_id: userId, content: clean, kind, ai_response: aiResponse })
    .select("*")
    .single();
  if (error) throw error;

  revalidatePath("/untangle");
  revalidatePath("/");
  return data as Thought;
}

export type ChatMsg = { role: "user" | "coach"; text: string };

// Follow-up chat with the coach on one thought. Messages are the rounds so far,
// ending with the user's newest message; returns the coach's reply.
export async function discussThought(id: string, messages: ChatMsg[]): Promise<string> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data: thought, error } = await supabase
    .from("thoughts")
    .select("content, ai_response")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !thought) throw new Error("Thought not found");

  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
  return untangleFollowUp({
    identity,
    profile,
    thought: thought.content as string,
    aiResponse: thought.ai_response as string | null,
    messages,
  });
}

export async function resolveThought(id: string, resolved = true): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase.from("thoughts").update({ resolved }).eq("id", id).eq("user_id", userId);
  revalidatePath("/untangle");
  revalidatePath("/");
}

export async function deleteThought(id: string): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase.from("thoughts").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/untangle");
  revalidatePath("/");
}
