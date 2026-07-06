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
    throw new Error(`OpenAI request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
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
    throw new Error(`Gemini request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function generateText(args: GenerateTextArgs): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider === "openai") return callOpenAI(args);
  if (provider === "gemini") return callGemini(args);
  throw new Error(`Unknown AI_PROVIDER "${provider}" — use "openai" or "gemini"`);
}
