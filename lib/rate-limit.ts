// Simple in-memory fixed-window rate limiter. First layer of brute-force
// defense on the auth endpoints. Per-instance memory only, so on serverless
// (Vercel) each instance keeps its own counters — good enough as a speed bump;
// swap for Redis/Upstash if you need a shared, durable limit across instances.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfter: number };

// Returns ok=false once `limit` requests land within `windowMs` for a key.
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Opportunistic sweep so the map can't grow without bound.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}
