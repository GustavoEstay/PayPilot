/**
 * Minimal fixed-window rate limiter, in memory and per server instance.
 * Good enough to protect a free-tier key in a demo; stage 2 would move this to a shared
 * store (e.g. Upstash/Vercel KV) so it holds across serverless instances.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now: number = Date.now()): RateLimitResult {
    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 5_000) {
      for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
    }
    const ok = entry.count <= options.limit;
    return {
      ok,
      remaining: Math.max(0, options.limit - entry.count),
      retryAfterSeconds: ok ? 0 : Math.ceil((entry.resetAt - now) / 1000),
    };
  };
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "anonymous";
}
