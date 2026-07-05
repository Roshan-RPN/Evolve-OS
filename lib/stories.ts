/**
 * Real people. Real willpower. These are short, factual retellings of how
 * actual achievers pushed through — not fables told in a character's name.
 *
 * Optional portrait: drop `public/stories/<slug>.webp` and it shows automatically
 * (same graceful-fallback pattern as the coach). Until then a bold monogram
 * poster renders so nothing ever looks broken.
 */
export type Story = {
  slug: string;
  name: string;
  field: string;
  years: string;
  grad: string; // gradient utility for the poster
  headline: string;
  body: string[]; // paragraphs
  lesson: string; // the willpower takeaway
  themes: string[]; // used to match a story to how you're feeling right now
};

export const STORIES: Story[] = [
  {
    slug: "david-goggins",
    name: "David Goggins",
    field: "Navy SEAL · Ultra-runner",
    years: "b. 1975",
    grad: "grad-coral",
    headline: "Weighed 297 lbs, then ran 100 miles on broken feet",
    body: [
      "Goggins was an overweight exterminator spraying for roaches, stuck in a life he hated. Deciding to become a Navy SEAL, he lost 106 pounds in three months to make the weight cut.",
      "He then failed SEAL training's Hell Week — not once but had to repeat it three times due to injuries including pneumonia and stress fractures. He finished anyway.",
      "In his first 100-mile ultramarathon, run on almost no training, his feet fractured and he urinated blood — and he kept moving to the finish.",
    ],
    lesson: "Callous your mind by doing the thing you're avoiding, especially when it hurts.",
    themes: ["self-belief", "failure", "giving-up", "discipline", "comeback"],
  },
  {
    slug: "jk-rowling",
    name: "J.K. Rowling",
    field: "Author",
    years: "b. 1965",
    grad: "grad-violet",
    headline: "Rejected by 12 publishers as a broke single mother",
    body: [
      "Rowling was a jobless single mother on welfare, describing herself as 'as poor as it is possible to be in modern Britain without being homeless.'",
      "She wrote Harry Potter in cafés while her daughter slept beside her. Twelve publishers rejected the manuscript.",
      "A small publisher, Bloomsbury, finally said yes — reportedly after the chairman's 8-year-old daughter begged to read the rest. The series went on to sell 600+ million copies.",
    ],
    lesson: "Rejection is data, not a verdict. Keep sending the work out.",
    themes: ["rejection", "self-belief", "failure", "giving-up", "comeback"],
  },
  {
    slug: "michael-jordan",
    name: "Michael Jordan",
    field: "Basketball",
    years: "b. 1963",
    grad: "grad-blue",
    headline: "Cut from his varsity team — used the list as fuel",
    body: [
      "As a sophomore Jordan was left off his high school's varsity roster. He went home and cried, then trained obsessively, using that cut list as motivation for years.",
      "He later said: 'I have missed more than 9,000 shots. I've lost almost 300 games. 26 times I've been trusted to take the game-winning shot and missed. I've failed over and over — and that is why I succeed.'",
    ],
    lesson: "Volume of attempts beats fear of missing. Take the shot.",
    themes: ["fear", "failure", "self-belief", "comeback"],
  },
  {
    slug: "nelson-mandela",
    name: "Nelson Mandela",
    field: "Statesman",
    years: "1918–2013",
    grad: "grad-emerald",
    headline: "27 years in prison, then chose reconciliation over revenge",
    body: [
      "Mandela spent 27 years imprisoned, 18 of them on Robben Island breaking rocks in a lime quarry that permanently damaged his eyes.",
      "He refused conditional release that required abandoning the anti-apartheid struggle. When freed, he led South Africa's transition to democracy and became president — and chose forgiveness over retaliation.",
    ],
    lesson: "Patience is a form of strength. Play the long game with your principles intact.",
    themes: ["patience", "humility", "grounded", "kindness", "victory", "adversity"],
  },
  {
    slug: "thomas-edison",
    name: "Thomas Edison",
    field: "Inventor",
    years: "1847–1931",
    grad: "grad-indigo",
    headline: "Thousands of failed filaments before the light bulb",
    body: [
      "Edison and his team tested thousands of materials searching for a workable light-bulb filament. When asked about the failures, he reportedly said he hadn't failed — he'd found thousands of ways that won't work.",
      "A factory fire once destroyed much of his life's work; the next morning he began rebuilding.",
    ],
    lesson: "Reframe failed attempts as eliminated options. Each one narrows the path.",
    themes: ["failure", "persistence", "giving-up", "comeback"],
  },
  {
    slug: "bethany-hamilton",
    name: "Bethany Hamilton",
    field: "Pro surfer",
    years: "b. 1990",
    grad: "grad-teal",
    headline: "Lost an arm to a shark at 13 — competing again in a month",
    body: [
      "At 13, a tiger shark took Bethany's left arm while she surfed in Hawaii. She lost over 60% of her blood.",
      "Less than a month later she was back on a board, teaching herself to paddle and pop up with one arm. Within two years she won a national title and turned pro.",
    ],
    lesson: "Adapt fast. The setback doesn't decide the timeline — you do.",
    themes: ["fear", "adversity", "comeback", "self-belief"],
  },
  {
    slug: "colonel-sanders",
    name: "Harland 'Colonel' Sanders",
    field: "Founder, KFC",
    years: "1890–1980",
    grad: "grad-sky",
    headline: "Started over at 65 on a small pension",
    body: [
      "Sanders had failed at many ventures and lost his roadside restaurant when a new highway bypassed it. At 65, living on a modest Social Security check, he drove around the country cooking chicken for restaurant owners.",
      "He was turned down many times before a franchise deal took off. KFC became a global brand he later sold for millions.",
    ],
    lesson: "It's rarely too late to start. Persistence compounds at any age.",
    themes: ["late-start", "persistence", "giving-up", "patience"],
  },
  {
    slug: "wilma-rudolph",
    name: "Wilma Rudolph",
    field: "Sprinter",
    years: "1940–1994",
    grad: "grad-coral",
    headline: "Told she'd never walk — won 3 Olympic golds",
    body: [
      "Rudolph contracted polio as a child, lost the use of her left leg, and wore a brace. Doctors said she would never walk normally.",
      "Through years of daily therapy and her family's help she not only walked but ran — becoming the first American woman to win three gold medals in track at a single Olympics (Rome, 1960).",
    ],
    lesson: "Consistency over time rewrites what 'impossible' meant.",
    themes: ["adversity", "self-belief", "patience", "comeback"],
  },
  {
    slug: "keanu-reeves",
    name: "Keanu Reeves",
    field: "Actor",
    years: "b. 1964",
    grad: "grad-teal",
    headline: "At the top of Hollywood — and famously humble with it",
    body: [
      "Reeves carried deep private grief: his daughter was stillborn, and soon after, his partner died in a car accident. He kept working and stayed quietly generous.",
      "Despite enormous fame and wealth, he's known for giving away large portions of his earnings to crew and charities, riding the subway, and treating everyone on set as an equal.",
      "He rarely brags, avoids the spotlight off-screen, and repeatedly credits his teams — success never turned into arrogance.",
    ],
    lesson: "When you're winning, stay grounded and kind. Ego is the tax that quietly bankrupts success.",
    themes: ["victory", "humility", "grounded", "kindness", "adversity"],
  },
];

/**
 * Feelings → story matcher. You tell the app how you feel right now and it
 * surfaces the stories whose vibe answers that feeling — a comeback story when
 * you've lost belief, a stay-grounded story when you feel victorious.
 */
export type Mood = {
  id: string;
  label: string;
  emoji: string;
  coachLine: string; // what Leo says for this feeling
  themes: string[]; // stories matching any of these surface
};

export const MOODS: Mood[] = [
  {
    id: "lost-belief",
    label: "I failed / lost my self-belief",
    emoji: "😔",
    coachLine: "Failing isn't the end of your story — it's the middle of everyone's. Read how they climbed back.",
    themes: ["self-belief", "failure", "comeback", "rejection"],
  },
  {
    id: "giving-up",
    label: "I want to give up",
    emoji: "🥵",
    coachLine: "The finish line is often just past the point it hurts most. These people refused to stop.",
    themes: ["giving-up", "persistence", "discipline"],
  },
  {
    id: "afraid",
    label: "I'm afraid",
    emoji: "😨",
    coachLine: "Courage isn't the absence of fear — it's moving while afraid. Watch them do exactly that.",
    themes: ["fear", "adversity"],
  },
  {
    id: "victorious",
    label: "I'm winning / I don't fear",
    emoji: "🔥",
    coachLine: "Good — now stay grounded. The real test of success is staying humble and kind at the top.",
    themes: ["victory", "humility", "grounded", "kindness"],
  },
  {
    id: "impatient",
    label: "I'm impatient / it's too slow",
    emoji: "⏳",
    coachLine: "Patience is a muscle, not a mood. These wins took years — and were worth every one.",
    themes: ["patience", "late-start", "persistence"],
  },
];

export function storiesForMood(moodId: string): Story[] {
  const mood = MOODS.find((m) => m.id === moodId);
  if (!mood) return [];
  return STORIES.filter((s) => s.themes.some((t) => mood.themes.includes(t)));
}

export function storyBySlug(slug: string) {
  return STORIES.find((s) => s.slug === slug);
}

/**
 * Situation → story matcher for the home hero. Reads today's real signals
 * (morning emotion + energy, self-respect average, how the day is going) and
 * surfaces the story that answers them — plus a plain-language reason, so the
 * card can say exactly where the pick came from. Falls back to a daily
 * rotation when there's no signal yet.
 */
export function storyForSituation(sig: {
  emotion?: string | null;
  energy?: number | null;
  selfRespect?: number | null;
  dayPct?: number;
  daySeed: number; // stable per-day index so the pick doesn't change on refresh
}): { story: Story; reason: string } {
  const pick = (themes: string[], reason: string) => {
    const pool = themes.length
      ? STORIES.filter((s) => s.themes.some((t) => themes.includes(t)))
      : STORIES;
    const list = pool.length ? pool : STORIES;
    return { story: list[((sig.daySeed % list.length) + list.length) % list.length], reason };
  };

  const emotion = (sig.emotion ?? "").toLowerCase();
  if (["anxious", "afraid", "scared", "nervous"].some((w) => emotion.includes(w)))
    return pick(["fear", "adversity"], `you told Leo you feel ${emotion} this morning`);
  if (sig.energy != null && sig.energy <= 4)
    return pick(["giving-up", "persistence", "discipline"], `your energy is ${sig.energy}/10 today — a keep-going story`);
  if (["tired", "flat", "drained", "scattered"].some((w) => emotion.includes(w)))
    return pick(["giving-up", "persistence", "discipline"], `you told Leo you feel ${emotion} — a keep-going story`);
  if (sig.selfRespect != null && sig.selfRespect > 0 && sig.selfRespect <= 5)
    return pick(
      ["self-belief", "failure", "comeback", "rejection"],
      `your self-respect has been running at ${sig.selfRespect}/10 — a comeback story`
    );
  if ((sig.dayPct ?? 0) >= 80)
    return pick(["victory", "humility", "grounded", "kindness"], `you're at ${sig.dayPct}% today — a stay-grounded story`);
  if (["motivated", "fired up", "hopeful"].some((w) => emotion.includes(w)))
    return pick(["victory", "humility", "grounded", "kindness"], `you woke up ${emotion} — a stay-grounded story`);
  return pick([], "today's rotation — log your morning mood and it matches your day");
}
