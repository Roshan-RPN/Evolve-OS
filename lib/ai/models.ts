// Gemini models a profile can pick for Leo. Shared by the profile UI (client)
// and the save action (server). Keep ids exactly as Google's model names.
export const GEMINI_MODELS = [
  {
    id: "gemini-2.5-pro",
    label: "2.5 Pro",
    blurb: "Deepest reasoning — sharpest coaching. Slower, lower free-tier limits.",
  },
  {
    id: "gemini-2.5-flash",
    label: "2.5 Flash",
    blurb: "Balanced speed and quality. Solid all-rounder.",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "2.5 Flash-Lite",
    blurb: "Fastest and lightest. Snappy, simpler answers.",
  },
] as const;

export const GEMINI_MODEL_IDS: string[] = GEMINI_MODELS.map((m) => m.id);
export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"];
