"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { GEMINI_MODEL_IDS } from "@/lib/ai/models";

export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  hasGeminiKey: boolean;
  geminiModel: string | null;
  created_at: string | null;
};

const MIGRATION_HINT =
  "Couldn't save — run migration 0010_profile_extras.sql in Supabase, then retry.";

/** Current profile's account row. Null if the row doesn't exist (legacy env-passcode owner). */
export async function getAppUser(): Promise<AppUser | null> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const { data } = await supabase.from("app_users").select("*").eq("id", userId).maybeSingle();
  if (!data) return null;
  const row = data as {
    id: string;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    gemini_api_key?: string | null;
    gemini_model?: string | null;
    created_at?: string | null;
  };
  return {
    id: row.id,
    name: row.name ?? "You",
    email: row.email ?? null,
    avatar: row.avatar ?? null,
    hasGeminiKey: Boolean(row.gemini_api_key),
    geminiModel: row.gemini_model ?? null,
    created_at: row.created_at ?? null,
  };
}

export async function updateAppUser(input: { name: string; email: string; avatar?: string }) {
  const userId = await getUserId();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const avatar = (input.avatar ?? "").trim();

  if (!name || name.length > 40) return { ok: false, error: "Pick a name (40 characters max)." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "That email doesn't look right." };

  const supabase = createServerClient();
  const payload: Record<string, string | null> = { name, email: email || null };
  if (input.avatar !== undefined) payload.avatar = avatar || null;
  const { error } = await supabase.from("app_users").update(payload).eq("id", userId);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "That name is already taken." : MIGRATION_HINT,
    };
  }
  revalidatePath("/profile");
  return { ok: true as const, error: null };
}

/** Save (or clear, with "") this profile's own Gemini API key. Never echoes the key back. */
export async function updateGeminiKey(key: string) {
  const userId = await getUserId();
  const clean = key.trim();
  // Google AI Studio keys come in two families and Google keeps adding more, so
  // we validate by SHAPE not by prefix: legacy "AIza…" is 39 chars, the newer
  // "AQ.Ab8…" runs ~53. Both use only [A-Za-z0-9._-]. Gate on charset + length
  // (35–100) so both pass and a future variant isn't wrongly rejected, while
  // spaces / short / garbage pastes still fail loud.
  if (clean && !/^[A-Za-z0-9._-]{35,100}$/.test(clean))
    return {
      ok: false,
      error: "That doesn't look like a Google AI Studio key. Paste the full key (nothing before or after it).",
    };

  const supabase = createServerClient();
  const { error } = await supabase
    .from("app_users")
    .update({ gemini_api_key: clean || null })
    .eq("id", userId);

  if (error) return { ok: false, error: MIGRATION_HINT };
  revalidatePath("/profile");
  return { ok: true as const, error: null };
}

/** Save this profile's Leo model, or "" to fall back to the app default. */
export async function updateGeminiModel(model: string) {
  const userId = await getUserId();
  const clean = model.trim();
  if (clean && !GEMINI_MODEL_IDS.includes(clean))
    return { ok: false, error: "Unknown model." };

  const supabase = createServerClient();
  const { error } = await supabase
    .from("app_users")
    .update({ gemini_model: clean || null })
    .eq("id", userId);

  if (error) return { ok: false, error: MIGRATION_HINT };
  revalidatePath("/profile");
  return { ok: true as const, error: null };
}
