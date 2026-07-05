/**
 * Evening scorecard — the honest, "hit in the head" readout that replaces the
 * old night-gratitude step. Each night you score the day across a few
 * dimensions (1–10) and write one brutally honest line. Shared by the client
 * wizard and the server action so the labels never drift.
 */
export type ScoreDimension = {
  key: string;
  label: string;
  hint: string;
  tint: string;
  grad: string;
};

export const EVENING_DIMENSIONS: ScoreDimension[] = [
  { key: "discipline", label: "Discipline", hint: "Did you do what you said you would?", tint: "tint-blue", grad: "grad-blue" },
  { key: "focus", label: "Deep focus", hint: "Real work, not busywork or scrolling.", tint: "tint-indigo", grad: "grad-indigo" },
  { key: "health", label: "Body", hint: "Movement, food, sleep — treated it well?", tint: "tint-emerald", grad: "grad-emerald" },
  { key: "relationships", label: "People", hint: "Showed up for someone who matters.", tint: "tint-teal", grad: "grad-teal" },
  { key: "integrity", label: "Integrity", hint: "No self-betrayal, no lies to yourself.", tint: "tint-violet", grad: "grad-violet" },
  { key: "growth", label: "Growth", hint: "Stretched past comfort at least once.", tint: "tint-coral", grad: "grad-coral" },
];

export type EveningScore = Record<string, number>;

export function emptyScorecard(): EveningScore {
  return Object.fromEntries(EVENING_DIMENSIONS.map((d) => [d.key, 5]));
}

export function scorecardAverage(score: EveningScore): number {
  const vals = EVENING_DIMENSIONS.map((d) => score[d.key] ?? 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function scorecardVerdict(avg: number): string {
  if (avg >= 8.5) return "Elite day. This is who you're becoming — do it again.";
  if (avg >= 7) return "Strong. A few gaps, but you showed up.";
  if (avg >= 5) return "Middle of the road. Comfortable isn't the goal.";
  if (avg >= 3) return "Soft day. You know it. Own it and reset.";
  return "You slipped hard today. No excuses — tomorrow you move.";
}

/** Formats the scorecard for the coach prompt. */
export function scorecardSummary(score: EveningScore): string {
  const lines = EVENING_DIMENSIONS.map((d) => `- ${d.label}: ${score[d.key] ?? "?"}/10`);
  return `${lines.join("\n")}\nAverage: ${scorecardAverage(score)}/10`;
}
