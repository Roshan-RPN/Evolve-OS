// Habit accent palette — 24 premium solids tuned for the white app background.
// Mid-lightness, restrained chroma: confident but never neon. The DB stores the
// key; the value is what gets painted (inline style, since these aren't classes).

export type HabitColor = { key: string; name: string; value: string };

export const HABIT_COLORS: HabitColor[] = [
  // Blues & navy
  { key: "ocean", name: "Ocean", value: "oklch(0.6 0.17 248)" },
  { key: "sky", name: "Sky", value: "oklch(0.71 0.13 220)" },
  { key: "denim", name: "Denim", value: "oklch(0.55 0.14 255)" },
  { key: "navy", name: "Navy", value: "oklch(0.42 0.13 258)" },
  { key: "indigo", name: "Indigo", value: "oklch(0.52 0.17 272)" },
  // Greens & greenish-blue
  { key: "teal", name: "Teal", value: "oklch(0.72 0.13 185)" },
  { key: "mint", name: "Mint", value: "oklch(0.78 0.11 170)" },
  { key: "emerald", name: "Emerald", value: "oklch(0.71 0.15 156)" },
  { key: "forest", name: "Forest", value: "oklch(0.52 0.11 160)" },
  { key: "sage", name: "Sage", value: "oklch(0.68 0.07 150)" },
  { key: "olive", name: "Olive", value: "oklch(0.62 0.1 120)" },
  // Warms
  { key: "gold", name: "Gold", value: "oklch(0.72 0.13 85)" },
  { key: "orange", name: "Orange", value: "oklch(0.7 0.16 55)" },
  { key: "amber", name: "Amber", value: "oklch(0.7 0.15 65)" },
  { key: "peach", name: "Peach", value: "oklch(0.8 0.09 60)" },
  { key: "coral", name: "Coral", value: "oklch(0.69 0.18 35)" },
  { key: "terracotta", name: "Terracotta", value: "oklch(0.6 0.13 40)" },
  { key: "brown", name: "Brown", value: "oklch(0.45 0.07 55)" },
  { key: "red", name: "Red", value: "oklch(0.58 0.2 27)" },
  { key: "rose", name: "Rose", value: "oklch(0.65 0.21 22)" },
  // Neutrals — slate, ash, steel, charcoal
  { key: "slate", name: "Slate", value: "oklch(0.49 0.035 256)" },
  { key: "ash", name: "Ash", value: "oklch(0.7 0.015 260)" },
  { key: "steel", name: "Steel", value: "oklch(0.6 0.04 240)" },
  { key: "charcoal", name: "Charcoal", value: "oklch(0.35 0.02 260)" },
];

const BY_KEY = new Map(HABIT_COLORS.map((c) => [c.key, c.value]));

/** Resolve a stored palette key to its paint value; null when unset/unknown. */
export function habitColorValue(key: string | null | undefined): string | null {
  if (!key) return null;
  return BY_KEY.get(key) ?? null;
}
