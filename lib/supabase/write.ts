// Supabase writes fail two different ways: a network-level throw (connection
// dropped mid-request — what loses a lock-in), or a returned `{ error }` for a
// DB/constraint problem (which the client does NOT throw on, so an unchecked
// write silently "succeeds" while saving nothing). This wraps a write so both
// paths are handled: transient failures are retried with backoff, and a final
// failure throws a clear error so the caller's UI shows "Try again" instead of
// faking success and losing the entry.
export async function writeWithRetry(
  label: string,
  fn: () => PromiseLike<{ error: unknown }>,
  tries = 3
): Promise<void> {
  let lastMsg = "unknown error";
  for (let i = 0; i < tries; i++) {
    try {
      const { error } = await fn();
      if (!error) return;
      lastMsg = (error as { message?: string })?.message ?? String(error);
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e);
    }
    if (i < tries - 1) {
      await new Promise((r) => setTimeout(r, 300 * 2 ** i + Math.random() * 150)); // 0.3s, 0.6s (+jitter)
    }
  }
  throw new Error(`${label} failed after ${tries} attempts: ${lastMsg}`);
}
