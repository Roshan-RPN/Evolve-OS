"use server";

import { randomUUID } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";
import { getIdentity, getProfile } from "@/lib/actions/onboarding";
import { getLevelGoals } from "@/lib/actions/goals";
import { visualizationScript, realStoryForMood } from "@/lib/ai/coach";
import { MOODS, storiesForMood } from "@/lib/stories";
import { todayISO, daysAgoISO, periodWeek } from "@/lib/date";

const VISION_BUCKET = "vision-board";

export type ManifestKind = "vision" | "proof" | "affirmation";

export type VisionFocus = "3yr" | "1yr" | "first_move" | "affirmation";

export type VisionSession = {
  id: string;
  date: string;
  focus: VisionFocus;
  vividness: number;
  body_location: string | null;
  felt_note: string | null;
  created_at: string;
};

export type ManifestEntry = {
  id: string;
  date: string;
  kind: ManifestKind;
  caption: string;
  image_url: string | null;
  goal_id: string | null;
  created_at: string;
};

// A goal from the cascade with its most-recent tagged image — drives the
// "Why I'm doing this" reminder strip.
export type GoalImage = {
  goal_id: string;
  level: "three_year" | "yearly";
  content: string;
  image_url: string | null;
};

// The auto-surfaced real-person story shown when today's logged mood is low.
export type MoodStory = {
  moodId: string;
  moodLabel: string;
  coachLine: string;
  name: string;
  field: string;
  headline: string;
  body: string[];
  lesson: string;
  source: "leo" | "curated";
};

export type NightlyVisualization = {
  date: string;
  text: string;
  first_move: string | null;
};

export type ManifestationData = {
  vision: { three_year: string; one_year: string; traits: string; behaviors: string };
  visionBoardUrl: string | null;
  entries: ManifestEntry[];
  goalImages: GoalImage[];
  nightly: NightlyVisualization[];
  sessions: VisionSession[];
  moodStory: MoodStory | null;
};

// checkins.mood enum → a MOODS id we have a matching story theme for.
const CHECKIN_MOOD_TO_MOOD_ID: Record<string, string> = {
  low: "lost-belief",
  stuck: "giving-up",
  confused: "afraid",
};

export async function getManifestationData(): Promise<ManifestationData> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const identity = await getIdentity();

  const [{ data: entries }, { data: journals }, sessionsRes, threeYearGoals, yearGoals] =
    await Promise.all([
      // goal_id may not exist yet (migration 0005) — select("*") tolerates that.
      supabase
        .from("manifestations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("journal_entries")
        .select("date, evening")
        .eq("user_id", userId)
        .gte("date", daysAgoISO(30))
        .lte("date", todayISO())
        .order("date", { ascending: false }),
      // Tolerate the table not existing yet (migration 0004 not run) — never crash the page.
      supabase
        .from("vision_sessions")
        .select("id, date, focus, vividness, body_location, felt_note, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      getLevelGoals("three_year"),
      getLevelGoals("yearly"),
    ]);

  const nightly: NightlyVisualization[] = (journals ?? [])
    .map((j) => {
      const ev = (j.evening ?? null) as { manifestation?: string; first_move?: string } | null;
      if (!ev?.manifestation) return null;
      return { date: j.date as string, text: ev.manifestation, first_move: ev.first_move ?? null };
    })
    .filter((x): x is NightlyVisualization => x !== null);

  const allEntries = (entries ?? []) as ManifestEntry[];

  // "Why I'm doing this": each 3-year / yearly goal with its most-recent tagged image.
  const latestImageForGoal = new Map<string, string>();
  for (const e of allEntries) {
    if (e.goal_id && e.image_url && !latestImageForGoal.has(e.goal_id)) {
      latestImageForGoal.set(e.goal_id, e.image_url); // entries are newest-first
    }
  }
  const goalImages: GoalImage[] = [
    ...(threeYearGoals ?? []).map((g) => ({ goal: g, level: "three_year" as const })),
    ...(yearGoals ?? []).map((g) => ({ goal: g, level: "yearly" as const })),
  ].map(({ goal, level }) => ({
    goal_id: goal.id,
    level,
    content: goal.content,
    image_url: latestImageForGoal.get(goal.id) ?? null,
  }));

  const moodStory = await resolveMoodStory(supabase, userId, identity, await getProfile());

  return {
    vision: {
      three_year: identity?.vision_3_year ?? "",
      one_year: identity?.vision_1_year ?? "",
      traits: identity?.future_identity_traits ?? "",
      behaviors: identity?.future_identity_behaviors ?? "",
    },
    visionBoardUrl:
      (identity as { vision_board_url?: string | null } | null)?.vision_board_url ?? null,
    entries: allEntries,
    goalImages,
    nightly,
    sessions: (sessionsRes.data ?? []) as VisionSession[],
    moodStory,
  };
}

// Reads today's logged check-in mood; if it's a low one, returns a real-person
// story for it — cached weekly in `mood_stories`, Leo-generated on first hit,
// with the hand-curated STORIES list as the always-safe fallback.
async function resolveMoodStory(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  identity: Awaited<ReturnType<typeof getIdentity>>,
  profile: Awaited<ReturnType<typeof getProfile>>
): Promise<MoodStory | null> {
  // Latest check-in mood for today.
  const { data: checkins } = await supabase
    .from("checkins")
    .select("mood, created_at")
    .eq("user_id", userId)
    .eq("date", todayISO())
    .not("mood", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const rawMood = checkins?.[0]?.mood as string | undefined;
  const moodId = rawMood ? CHECKIN_MOOD_TO_MOOD_ID[rawMood] : undefined;
  if (!moodId) return null;

  const mood = MOODS.find((m) => m.id === moodId);
  if (!mood) return null;

  const week = periodWeek();

  // Return this week's cached story if present.
  const { data: cached } = await supabase
    .from("mood_stories")
    .select("name, field, headline, body, lesson, source")
    .eq("user_id", userId)
    .eq("week", week)
    .eq("mood", moodId)
    .maybeSingle();
  if (cached) {
    return {
      moodId,
      moodLabel: mood.label,
      coachLine: mood.coachLine,
      name: cached.name as string,
      field: (cached.field as string) ?? "",
      headline: (cached.headline as string) ?? "",
      body: (cached.body as string[]) ?? [],
      lesson: (cached.lesson as string) ?? "",
      source: (cached.source as "leo" | "curated") ?? "leo",
    };
  }

  // Generate a fresh real-person story, excluding everyone already on the board.
  const curated = storiesForMood(moodId);
  const excludeNames = curated.map((s) => s.name);
  let story: MoodStory | null = null;
  try {
    const gen = await realStoryForMood({
      identity,
      profile,
      moodLabel: mood.label,
      themes: mood.themes,
      excludeNames,
    });
    if (gen) {
      story = { moodId, moodLabel: mood.label, coachLine: mood.coachLine, ...gen, source: "leo" };
    }
  } catch {
    story = null;
  }

  // Fallback: a real curated person for this mood — never leave the user staring at nothing.
  if (!story && curated.length > 0) {
    const s = curated[0];
    story = {
      moodId,
      moodLabel: mood.label,
      coachLine: mood.coachLine,
      name: s.name,
      field: s.field,
      headline: s.headline,
      body: s.body,
      lesson: s.lesson,
      source: "curated",
    };
  }
  if (!story) return null;

  // Cache for the rest of the week (tolerate the table not existing yet).
  await supabase
    .from("mood_stories")
    .upsert(
      {
        user_id: userId,
        week,
        mood: moodId,
        name: story.name,
        field: story.field,
        headline: story.headline,
        body: story.body,
        lesson: story.lesson,
        source: story.source,
      },
      { onConflict: "user_id,week,mood" }
    );

  return story;
}

// Generate (but do not save) a guided visualization script for the ritual overlay.
export async function startVisualization(
  focus: "3yr" | "1yr" | "affirmation",
  affirmationText?: string
): Promise<string> {
  const [identity, profile] = await Promise.all([getIdentity(), getProfile()]);
  const focusText =
    focus === "3yr"
      ? identity?.vision_3_year ?? ""
      : focus === "1yr"
        ? identity?.vision_1_year ?? ""
        : (affirmationText ?? "").trim();
  return visualizationScript({ identity, profile, focus, focusText });
}

export async function saveVisionSession(input: {
  focus: VisionFocus;
  vividness: number;
  body_location: string;
  felt_note: string;
}): Promise<VisionSession | null> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const vividness = Math.min(10, Math.max(1, Math.round(input.vividness)));
  const { data } = await supabase
    .from("vision_sessions")
    .insert({
      user_id: userId,
      focus: input.focus,
      vividness,
      body_location: input.body_location.trim() || null,
      felt_note: input.felt_note.trim() || null,
      date: todayISO(),
    })
    .select("id, date, focus, vividness, body_location, felt_note, created_at")
    .single();
  return (data as VisionSession) ?? null;
}

export async function addManifestation(input: {
  caption: string;
  image_url: string;
  kind: ManifestKind;
  goal_id?: string | null;
}): Promise<ManifestEntry | null> {
  const caption = input.caption.trim();
  if (!caption) return null;
  const userId = await getUserId();
  const supabase = createServerClient();
  const image_url = input.image_url.trim() || null;

  const { data } = await supabase
    .from("manifestations")
    .insert({
      user_id: userId,
      caption,
      image_url,
      kind: input.kind,
      goal_id: input.goal_id || null,
      date: todayISO(),
    })
    .select("*")
    .single();

  return (data as ManifestEntry) ?? null;
}

export async function deleteManifestation(id: string): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase.from("manifestations").delete().eq("id", id).eq("user_id", userId);
}

// Upload an image file to the vision-board bucket and return its public URL.
// Randomized path (unguessable); returns null on any failure so the UI can
// show an error and fall back to the URL-paste field.
// Only real image types, each pinned to the content-type WE serve it as — never
// the client-supplied file.type (which could be text/html and turn the public
// bucket into an XSS host). Extension not on this list → rejected.
const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function uploadVisionImage(formData: FormData): Promise<string | null> {
  await getUserId(); // server action — require a real session (redirects if not)
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) return null; // oversized → reject (storage/DoS guard)

  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const contentType = IMAGE_TYPES[ext];
  if (!contentType) return null; // not an allowed image extension

  const supabase = createServerClient();
  const path = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(VISION_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) return null;

  const { data } = supabase.storage.from(VISION_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

// Persist the single hero vision-board image URL on the one-row identity table.
export async function setVisionBoard(url: string): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  const value = url.trim() || null;
  const identity = await getIdentity();
  if (identity) {
    await supabase
      .from("identity")
      .update({ vision_board_url: value, updated_at: new Date().toISOString() })
      .eq("id", identity.id);
  } else {
    await supabase.from("identity").insert({ vision_board_url: value, user_id: userId });
  }
}

// Remove the hero vision-board image (clears the URL, keeps the setting row).
export async function clearVisionBoard(): Promise<void> {
  await setVisionBoard("");
}

// Remove a goal's tagged image — deletes the manifestation entries that carry
// it so "Why I'm doing this" falls back to the empty "add a picture" state.
export async function clearGoalImage(goalId: string): Promise<void> {
  const userId = await getUserId();
  const supabase = createServerClient();
  await supabase
    .from("manifestations")
    .delete()
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .not("image_url", "is", null);
}
