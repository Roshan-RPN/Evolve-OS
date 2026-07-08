// Thin, provider-swappable AI client. Set AI_PROVIDER=openai|gemini in .env.local
// along with the matching API key. Every AI feature in the app (plan critique,
// morning story, night realization, pattern detection, drift check, manifestation)
// calls generateText() below instead of touching a provider SDK directly.

import { createServerClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/user";

type GenerateTextArgs = {
  system: string;
  prompt: string;
  temperature?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gemini/OpenAI free tiers routinely throw transient 503 "high demand" (and the
// odd 429/500) that clear on a quick retry. Without this a single blip drops Leo
// to his fallback text. Retry the retryable statuses with short backoff; let
// real errors (bad key 403, bad request 400) fail fast.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      if (status === undefined || !RETRYABLE.has(status) || i === tries - 1) throw e;
      await sleep(400 * 2 ** i + Math.random() * 200); // 0.4s, 0.8s, 1.6s (+jitter)
    }
  }
  throw lastErr;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The signed-in profile's own Gemini key + model choice, if saved on /profile.
    Falls back to nulls outside a session (or before migrations 0010/0014 ran). */
async function userAiConfig(): Promise<{ key: string | null; model: string | null }> {
  try {
    const userId = await getUserId();
    const supabase = createServerClient();
    const { data } = await supabase
      .from("app_users")
      .select("gemini_api_key, gemini_model")
      .eq("id", userId)
      .maybeSingle();
    const row = data as { gemini_api_key?: string | null; gemini_model?: string | null } | null;
    return { key: row?.gemini_api_key ?? null, model: row?.gemini_model ?? null };
  } catch {
    return { key: null, model: null };
  }
}

async function callOpenAI({ system, prompt, temperature = 0.8 }: GenerateTextArgs) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new HttpError(res.status, `OpenAI request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const out = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!out) throw new Error("OpenAI returned an empty response");
  return out;
}

async function callGemini({ system, prompt, temperature = 0.8 }: GenerateTextArgs) {
  // Per-profile key + model first (each user runs Leo on their own quota and
  // their own model pick); env values are the shared fallback.
  const cfg = await userAiConfig();
  const apiKey = cfg.key || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = cfg.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new HttpError(res.status, `Gemini request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const out = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  // A 200 with no text (safety block, or a thinking model that spent its whole
  // budget) would otherwise save a blank read. Treat empty as a failure so the
  // caller's fallback text shows instead of Leo going silent.
  if (!out) throw new Error("Gemini returned an empty response");
  return out;
}

export async function generateText(args: GenerateTextArgs): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider === "openai") return withRetry(() => callOpenAI(args));
  if (provider === "gemini") return withRetry(() => callGemini(args));
  throw new Error(`Unknown AI_PROVIDER "${provider}" — use "openai" or "gemini"`);
}
