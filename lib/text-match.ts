// Loose match between a schedule block's text and a check-in's linked
// priority — exact text rarely survives re-wording (e.g. "Finish report" vs
// "9am — finish the report draft"), so either string containing the other
// (case-insensitive, trimmed) counts as the same task.
export function tasksLink(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}
