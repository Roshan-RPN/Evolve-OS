import { generateText } from "./client";

type Identity = {
  vision_3_year?: string | null;
  vision_1_year?: string | null;
  future_identity_traits?: string | null;
  future_identity_behaviors?: string | null;
} | null;

type Profile = {
  who_you_are_now?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  past_patterns?: string | null;
  motivation?: string | null;
  fears?: string | null;
  capacity_check?: string | null;
  energy_pattern?: string | null;
  feedback_style?: string | null;
} | null;

function coachPersona(identity: Identity, profile: Profile) {
  return `You are the user's personal identity & execution coach inside their "Life OS" app.
Your contract with them: be direct and honest, never toxic-positivity, never generic affirmation-speak.
Call out gaps between what they say and what they do. Keep responses short, specific, and grounded in
their actual context below — never generic self-help language.

FUTURE IDENTITY (who they are becoming):
- Traits: ${identity?.future_identity_traits || "not set yet"}
- Daily/weekly behaviors of that identity: ${identity?.future_identity_behaviors || "not set yet"}
- 1-year vision: ${identity?.vision_1_year || "not set yet"}
- 3-year vision: ${identity?.vision_3_year || "not set yet"}

PROFILE:
- Who they are now: ${profile?.who_you_are_now || "unknown"}
- Strengths: ${profile?.strengths || "unknown"}
- Weaknesses: ${profile?.weaknesses || "unknown"}
- Past patterns (quitting/following through): ${profile?.past_patterns || "unknown"}
- Motivation: ${profile?.motivation || "unknown"}
- Fears: ${profile?.fears || "unknown"}
- Capacity constraints: ${profile?.capacity_check || "unknown"}
- Energy pattern: ${profile?.energy_pattern || "unknown"}
- What feedback style actually lands with them: ${profile?.feedback_style || "direct and blunt"}`;
}

export async function critiquePlan({
  identity,
  profile,
  plan,
  recentCompletionRate,
}: {
  identity: Identity;
  profile: Profile;
  plan: { top_priorities: string[]; todo: string[]; schedule: { time: string; block: string }[] };
  recentCompletionRate: string;
}) {
  const system = coachPersona(identity, profile);
  const prompt = `Here is today's plan the user just submitted:
Top 3 priorities: ${JSON.stringify(plan.top_priorities)}
To-do list: ${JSON.stringify(plan.todo)}
Schedule: ${JSON.stringify(plan.schedule)}

Their recent actual completion history: ${recentCompletionRate}

Give a short, blunt verdict (3-5 sentences max): is this plan realistic given their history and capacity,
or overloaded/underloaded? If overloaded, name exactly what to cut. If it's actually realistic, say so
plainly and don't invent a problem. Do not use bullet points, write it as direct spoken feedback.`;
  return generateText({ system, prompt, temperature: 0.5 });
}

export async function morningStory({
  identity,
  profile,
  mood,
  energy,
}: {
  identity: Identity;
  profile: Profile;
  mood: string;
  energy: string;
}) {
  const system = coachPersona(identity, profile);
  const prompt = `The user just logged their morning mood as "${mood}" and energy as "${energy}".
Tell one short, specific, grounded story (real historical/public figure, or a realistic composite —
say which) of someone who faced a struggle relevant to becoming the future identity above, or matching
this mood, and how they pushed through with a concrete action, not vague willpower. 120-180 words.
End with one line connecting it directly to today for this specific user. No generic platitudes.`;
  return generateText({ system, prompt, temperature: 0.9 });
}

export async function middayNudge({
  identity,
  profile,
  onTrackScore,
  energy,
  priorityProgress,
  drift,
  honestLine,
  refocus,
  checkinsSummary,
}: {
  identity: Identity;
  profile: Profile;
  onTrackScore: number;
  energy: string;
  priorityProgress: string;
  drift: string;
  honestLine: string;
  refocus: string;
  checkinsSummary: string;
}) {
  const system = coachPersona(identity, profile);
  const prompt = `It's the middle of the user's day and they just did a quick midday reset.

How on-track they feel right now (1-10): ${onTrackScore}
Energy right now: ${energy || "not said"}

Where today's priorities actually stand:
${priorityProgress || "(no locked priorities today)"}

What pulled them off track: "${drift || "(left blank)"}"
Their one honest line about the morning: "${honestLine || "(left blank)"}"
The one thing they want to nail before evening: "${refocus || "(left blank)"}"

What their mid-day check-ins say so far:
${checkinsSummary}

Write a short "midday recalibration" — not a pep talk, a course-correction. Half the day is still theirs.
If a priority is stalled or untouched, name it and point at the very next physical step to unstick it.
If the drift they named is a known pattern of theirs, say so plainly. If they're actually on track, confirm
it in one line and protect the momentum instead of inventing a problem. Anchor everything on the ONE refocus
they chose — make the rest of the day about landing that. End with one concrete move for the next 30 minutes.
90-140 words, no bullet points, direct spoken tone, second person.`;
  return generateText({ system, prompt, temperature: 0.6 });
}

export async function moodBoostStory({
  identity,
  profile,
  mood,
}: {
  identity: Identity;
  profile: Profile;
  mood: "low" | "stuck" | "confused";
}) {
  const system = coachPersona(identity, profile);
  const prompt = `The user just tapped that they're feeling "${mood}" in the middle of their day.
Give a short (80-120 words) grounding message: acknowledge the feeling without coddling it, tell a very
brief (2-3 sentence) real example of someone who felt exactly this and still moved, then give one
concrete next physical action they can take in the next 5 minutes. Direct tone, no fluff.`;
  return generateText({ system, prompt, temperature: 0.9 });
}

export async function untangleConfusion({
  identity,
  profile,
  recentThoughts,
  content,
}: {
  identity: Identity;
  profile: Profile;
  recentThoughts: { content: string; created_at?: string }[];
  content: string;
}) {
  const system = coachPersona(identity, profile);
  const history = recentThoughts.length
    ? recentThoughts.map((t, i) => `${i + 1}. ${t.content}`).join("\n")
    : "none on file yet";
  const prompt = `The user just dumped this confusion/tangle to get unstuck:
"""${content}"""

Their last few dumps (most recent first) for pattern context:
${history}

Untangle it for them in this exact shape, no headers or bullet points, flowing but tight:
1) One line that acknowledges it honestly without coddling.
2) Reframe the confusion in a single clarifying sentence — what's actually the knot here.
3) Ask exactly ONE sharp question that cuts to what they're avoiding or haven't decided.
4) Give ONE concrete thing they can do in the next 5 minutes to move.
If this same confusion is clearly repeating from their recent dumps, name that directly.
90-130 words, direct spoken tone, second person.`;
  return generateText({ system, prompt, temperature: 0.7 });
}

export async function untangleFollowUp({
  identity,
  profile,
  thought,
  aiResponse,
  messages,
}: {
  identity: Identity;
  profile: Profile;
  thought: string;
  aiResponse: string | null;
  messages: { role: "user" | "coach"; text: string }[];
}) {
  const system = coachPersona(identity, profile);
  const transcript = messages
    .map((m) => `${m.role === "user" ? "USER" : "COACH"}: ${m.text}`)
    .join("\n");
  const userRounds = messages.filter((m) => m.role === "user").length;
  const prompt = `The user is still confused or pushing back on an untangle session. This is a live back-and-forth — they committed to talking it through with you for at least 5 rounds until it's actually clear.

Their original confusion:
"""${thought}"""

Your first take on it:
"""${aiResponse || "(none was generated)"}"""

The conversation so far (this is round ${userRounds} of the follow-up):
${transcript}

Reply to their LAST message directly. Rules:
- 2-5 sentences, direct spoken tone, second person, no bullet points or headers.
- Engage their exact words — if they disagree with you, take the disagreement seriously and either concede the valid part or show precisely where their reasoning breaks. Never just restate your first take.
- Each round must move the knot forward: sharpen what's actually unresolved, don't loop.
- ${userRounds >= 4 ? "This is late in the conversation — drive to a clear resolution now: state the decision or reframe in one plain sentence, then give ONE concrete action for the next 24 hours." : "If a sharp question would cut deeper than an answer, ask it — but only one."}`;
  return generateText({ system, prompt, temperature: 0.7 });
}

export async function eveningRealization({
  identity,
  profile,
  journalEntry,
  scorecardSummary,
  honestReadout,
  checkinsSummary,
  recentPatterns,
}: {
  identity: Identity;
  profile: Profile;
  journalEntry: Record<string, unknown>;
  scorecardSummary: string;
  honestReadout: string;
  checkinsSummary: string;
  recentPatterns: string;
}) {
  const system = coachPersona(identity, profile);
  const prompt = `Tonight's journal entry:
${JSON.stringify(journalEntry, null, 2)}

Tonight's self-scorecard (1-10 across the day's core dimensions):
${scorecardSummary}

Their own brutally-honest one-line readout of the day:
"${honestReadout || "(left blank)"}"

What actually happened today according to mid-day check-ins (more reliable than the night write-up alone):
${checkinsSummary}

Patterns already on file from previous days:
${recentPatterns}

Write the "realization dose" — an honest, hit-in-the-head readout, not a pep talk. Cross-reference their
scorecard against what actually happened per the check-ins: if they scored themselves generously on a
dimension the check-ins contradict (e.g. high Discipline but skipped priorities), call the inflation out
directly by name. If their honest one-liner names something real, sharpen it. If tonight's mistakes or
"better tomorrow" repeats something already in the pattern log, quote the earlier instance. If a genuinely
new pattern shows up, name it plainly. Never coddle a low-scoring day, never inflate a strong one. End with
exactly one concrete, small action for tomorrow. 150-220 words, no bullet points, direct spoken feedback.`;
  return generateText({ system, prompt, temperature: 0.6 });
}

export async function driftCheck({
  identity,
  profile,
  recentActivitySummary,
}: {
  identity: Identity;
  profile: Profile;
  recentActivitySummary: string;
}) {
  const system = coachPersona(identity, profile);
  const prompt = `Future identity behaviors this person defined for themselves:
${identity?.future_identity_behaviors || "not set"}

Their actual activity over the recent period:
${recentActivitySummary}

Write an Identity Drift Report: which defined behaviors are being lived, which have quietly dropped off,
roughly how long the drift has run, and one concrete corrective action. Be specific and blunt, reference
the actual behaviors by name, not generic categories. 150-200 words.`;
  return generateText({ system, prompt, temperature: 0.5 });
}

export async function suggestGoals({
  identity,
  profile,
  level,
  parentGoals,
  existing,
}: {
  identity: Identity;
  profile: Profile;
  level: string;
  parentGoals: string[];
  existing: string[];
}): Promise<string[]> {
  const system = coachPersona(identity, profile);
  const horizon = level === "weekly" ? "this week" : level === "monthly" ? "this month" : level;
  const parentLabel =
    level === "weekly" ? "monthly goals" : level === "monthly" ? "yearly goals" : "higher goals";
  const prompt = `The user is planning their goals for ${horizon}.
Their ${parentLabel} these must serve:
${parentGoals.length ? parentGoals.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none set yet — anchor on their vision above)"}

Goals they have already set for ${horizon}:
${existing.length ? existing.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none yet)"}

Propose 3-5 concrete, specific goals for ${horizon} that directly move the ${parentLabel} above forward.
Each must be a real action or measurable outcome, not a vague theme, grounded in their actual context —
never generic self-help. Do not repeat goals they have already set.
Output ONLY the goals, one per line. No numbering, no bullets, no headers, no extra commentary.`;
  const raw = await generateText({ system, prompt, temperature: 0.4 });
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function evaluateWeekPlan({
  identity,
  profile,
  weekLabel,
  days,
  monthGoals,
  trend,
}: {
  identity: Identity;
  profile: Profile;
  weekLabel: string;
  days: { weekday: string; goal: string; action: string; done: boolean }[];
  monthGoals: string[];
  trend: string;
}): Promise<string> {
  const system = coachPersona(identity, profile);
  const planLines = days
    .map((d) => {
      if (!d.goal.trim()) return `${d.weekday}: (no plan)`;
      return `${d.weekday}: goal "${d.goal}"${d.action.trim() ? ` | action "${d.action}"` : ""} → ${d.done ? "DONE" : "NOT done"}`;
    })
    .join("\n");
  const prompt = `The user planned a goal + action for each day of ${weekLabel} and marked what they finished.

Their week — plan vs actual:
${planLines}

The monthly goals this week was meant to move forward:
${monthGoals.length ? monthGoals.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none set)"}

Their recent weekly completion trend: ${trend || "no history yet"}

Write a blunt weekly evaluation (4-6 sentences, no bullet points, direct spoken tone). Cover: how far they landed from their own plan, which specific days or goals slipped, whether this pace keeps the monthly goals on track or puts them at risk (say roughly how likely they are to hit the month at this rate), and end with ONE concrete adjustment for next week. Reference the actual goals by name. No generic encouragement, no coddling.`;
  return generateText({ system, prompt, temperature: 0.5 });
}

export async function visionFeedback({
  identity,
  profile,
  horizon,
  vision,
  goals,
}: {
  identity: Identity;
  profile: Profile;
  horizon: string;
  vision: string;
  goals: { content: string; done: boolean }[];
}): Promise<string> {
  const system = coachPersona(identity, profile);
  const goalLines = goals.length
    ? goals.map((g) => `- ${g.content} → ${g.done ? "done" : "open"}`).join("\n")
    : "(no goals set yet)";
  const prompt = `The user wants your honest read on their ${horizon} plan.

Their ${horizon} vision:
${vision.trim() || "(not written yet)"}

The goals meant to make it real:
${goalLines}

In 4-6 blunt sentences, spoken tone, no bullets: say whether the vision is sharp enough to act on or too vague, whether these goals would actually get them there, name the weakest or missing goal, and end with ONE concrete change to make this week. Reference their vision and goals by name. If something is genuinely strong, say so plainly — don't invent problems.`;
  return generateText({ system, prompt, temperature: 0.5 });
}

export async function monthOutlook({
  identity,
  profile,
  monthLabel,
  goals,
  yearlyGoals,
  pct,
}: {
  identity: Identity;
  profile: Profile;
  monthLabel: string;
  goals: { content: string; done: boolean }[];
  yearlyGoals: string[];
  pct: number;
}): Promise<string> {
  const system = coachPersona(identity, profile);
  const goalLines = goals.length
    ? goals.map((g) => `- ${g.content} → ${g.done ? "done" : "open"}`).join("\n")
    : "(no goals set for this month)";
  const prompt = `Assess how likely the user is to finish ${monthLabel} on target and push them.

This month's goals (${pct}% marked done):
${goalLines}

The yearly goals these feed:
${yearlyGoals.length ? yearlyGoals.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none set)"}

In 2-3 blunt sentences: state whether they're on track to hit this month, name the single goal most at risk, and give one concrete push for what to do next. No bullets, no fluff, reference goals by name.`;
  return generateText({ system, prompt, temperature: 0.5 });
}

export async function visualizationScript({
  identity,
  profile,
  focus,
  focusText,
}: {
  identity: Identity;
  profile: Profile;
  focus: "3yr" | "1yr" | "affirmation";
  focusText: string;
}): Promise<string> {
  const system = coachPersona(identity, profile);
  const horizon =
    focus === "3yr"
      ? "their 3-year vision"
      : focus === "1yr"
        ? "their 1-year vision"
        : "the affirmation they chose";
  const prompt = `Guide the user through a short, grounded visualization of ${horizon}:
"""${focusText || "(they haven't written this yet — anchor on the future identity above)"}"""

Write it as a calm, present-tense, second-person script they read once, slowly, right now. Have them
step into that future scene concretely: what they see around them, what they're doing with their hands,
who is there, and — most important — name exactly where in the body they'd feel it (chest, gut, shoulders,
breath). Close with one line tying that felt sense to the very next real action they can take today.
5-7 sentences. Concrete and sensory — no abstract "the universe" manifestation language, no bullet points.`;
  return generateText({ system, prompt, temperature: 0.8 });
}

export type SuggestedHabit = { habit: string; anchor: string; time_of_day: string };

export async function suggestHabits({
  identity,
  profile,
  existing,
}: {
  identity: Identity;
  profile: Profile;
  existing: string[];
}): Promise<SuggestedHabit[]> {
  const system = coachPersona(identity, profile);
  const prompt = `The user is building a habit stack to become the future identity above.
Habit stacking means anchoring a new habit to something they already reliably do
("After [existing anchor], I will [new habit]").

Habits they already have:
${existing.length ? existing.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none yet)"}

Propose 3-5 concrete habits that directly move them toward the future identity and vision above —
small enough to actually stick, grounded in their real context, never generic self-help. For each, pick a
realistic existing anchor and the time of day it fits.
Output ONLY the habits, one per line, in EXACTLY this pipe format, nothing else:
time_of_day | anchor | habit
Where time_of_day is one of: morning, afternoon, evening, anytime.
Example: morning | pouring my coffee | read 5 pages
Do not repeat habits they already have. No numbering, no bullets, no headers, no commentary.`;
  const raw = await generateText({ system, prompt, temperature: 0.5 });
  const allowed = new Set(["morning", "afternoon", "evening", "anytime"]);
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) return null;
      const [tod, anchor, habit] = parts;
      if (!habit) return null;
      const time_of_day = allowed.has(tod.toLowerCase()) ? tod.toLowerCase() : "anytime";
      return { habit, anchor, time_of_day } as SuggestedHabit;
    })
    .filter((x): x is SuggestedHabit => x !== null)
    .slice(0, 5);
}

export type RealStory = {
  name: string;
  field: string;
  headline: string;
  body: string[];
  lesson: string;
};

// Pick ONE real, documented person who overcame the theme behind a low mood.
// Hard-constrained to real widely-known facts only — never a fabricated or
// "your-situation" story. Returns null on any failure so callers fall back to
// the hand-curated STORIES list.
export async function realStoryForMood({
  identity,
  profile,
  moodLabel,
  themes,
  excludeNames,
}: {
  identity: Identity;
  profile: Profile;
  moodLabel: string;
  themes: string[];
  excludeNames: string[];
}): Promise<RealStory | null> {
  const system = coachPersona(identity, profile);
  const prompt = `The user is feeling: "${moodLabel}" (themes: ${themes.join(", ")}).

Pick ONE real, world-famous, extensively documented person whose true life story answers exactly this feeling — someone who faced ${themes.join(" / ")} and pushed through. If it can naturally fit, lean toward a figure from a field close to the user's own goals/identity above, but staying REAL matters more than staying on-theme.

STRICT RULES — this must be true, not inspirational fiction:
- A real, verifiable, widely-known public figure. NO made-up people, NO composite characters, NO "imagine a person like you" story.
- Use ONLY well-known, widely-documented facts. Do NOT invent quotes, statistics, dates, or events. If you're unsure a detail is real, leave it out.
- Do NOT tell a story about the user's own situation. It must be about the real person.
- Do NOT reuse any of these already-shown people: ${excludeNames.length ? excludeNames.join(", ") : "(none)"}.

Output in EXACTLY this format, nothing else:
NAME: <person's name>
FIELD: <what they're known for, e.g. "Boxing" or "Founder, Apple">
HEADLINE: <one vivid true sentence capturing the turnaround>
BODY: <2-3 short factual paragraphs, separated by " || " — what they faced and how they pushed through, real facts only>
LESSON: <one blunt takeaway the user can apply>`;
  const raw = await generateText({ system, prompt, temperature: 0.5 });

  const pick = (label: string) => {
    const m = raw.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im"));
    return m ? m[1].trim() : "";
  };
  const name = pick("NAME");
  const bodyRaw = pick("BODY");
  const body = bodyRaw
    .split(/\s*\|\|\s*|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!name || body.length === 0) return null;
  // Guard against the model echoing an excluded name despite instructions.
  if (excludeNames.some((n) => n && name.toLowerCase() === n.toLowerCase())) return null;

  return {
    name,
    field: pick("FIELD"),
    headline: pick("HEADLINE"),
    body,
    lesson: pick("LESSON"),
  };
}

export async function manifestationPrompt({
  identity,
  profile,
  firstMove,
}: {
  identity: Identity;
  profile: Profile;
  firstMove: string;
}) {
  const system = coachPersona(identity, profile);
  const prompt = `The user's "Tomorrow's 1st Move" is: "${firstMove}".
Write a short (5-6 sentence) guided visualization prompt for them to read and act on right now: have them
picture themselves already doing this specific move successfully, name where in their body they'd feel it,
and close by tying that feeling directly to taking the action tomorrow morning. Present tense, second
person, concrete — no abstract manifestation language.`;
  return generateText({ system, prompt, temperature: 0.8 });
}
