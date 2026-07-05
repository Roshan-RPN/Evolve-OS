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

/** The signed-in profile's own Gemini key, if they saved one on /profile.
    Falls back to null outside a session (or before migration 0010 ran). */
async function userGeminiKey(): Promise<string | null> {
  try {
    const userId = await getUserId();
    const supabase = createServerClient();
    const { data } = await supabase
      .from("app_users")
      .select("gemini_api_key")
      .eq("id", userId)
      .maybeSingle();
    return (data as { gemini_api_key?: string | null } | null)?.gemini_api_key ?? null;
  } catch {
    return null;
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
  // Per-profile key first (each user runs Leo on their own quota), env key as shared fallback.
  const apiKey = (await userGeminiKey()) || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
