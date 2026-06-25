type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateBucket>;

declare global {
  var __ateliePublicRateLimit: RateLimitStore | undefined;
}

const store: RateLimitStore = globalThis.__ateliePublicRateLimit ?? new Map<string, RateBucket>();
globalThis.__ateliePublicRateLimit = store;

export function checkRateLimit(key: string, options?: { limit?: number; windowMs?: number; now?: number }) {
  const limit = options?.limit ?? 60;
  const windowMs = options?.windowMs ?? 60_000;
  const now = options?.now ?? Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export function publicRequestKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || "unknown";
  return `${scope}:${ip}`;
}
