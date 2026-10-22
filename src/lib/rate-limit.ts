type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { rwarestoRateLimit?: Map<string, Bucket> };
const buckets = globalStore.rwarestoRateLimit ?? new Map<string, Bucket>();
globalStore.rwarestoRateLimit = buckets;

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfter: 0,
  };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

if (buckets.size > 5000) {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
