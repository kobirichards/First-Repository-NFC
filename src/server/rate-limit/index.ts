import "server-only";

export type LimitRule = { /** seconds */ window: number; max: number };
export type LimitResult = { ok: boolean; remaining: number; retryAfter: number };

export interface RateLimiter {
  hit(key: string, rule: LimitRule): Promise<LimitResult>;
}

/** Fixed-window limiter in process memory. Fine for development and a single server; not shared across instances. */
export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, rule: LimitRule): Promise<LimitResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rule.window * 1000 };
      this.buckets.set(key, bucket);
      if (this.buckets.size > 10_000) this.sweep(now);
    }
    bucket.count += 1;
    const ok = bucket.count <= rule.max;
    return { ok, remaining: Math.max(0, rule.max - bucket.count), retryAfter: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000) };
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

/**
 * Fixed-window limiter on Upstash Redis via its REST API (works on serverless).
 * UNTESTED until UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured.
 * Fails open (allows the request) if Redis is unreachable, and logs it.
 */
export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async hit(key: string, rule: LimitRule): Promise<LimitResult> {
    const redisKey = `rl:${key}`;
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, String(rule.window), "NX"],
          ["TTL", redisKey],
        ]),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const [incr, , ttl] = (await res.json()) as Array<{ result: number }>;
      const count = incr.result;
      const ok = count <= rule.max;
      return { ok, remaining: Math.max(0, rule.max - count), retryAfter: ok ? 0 : Math.max(1, ttl.result) };
    } catch (error) {
      console.error("[rate-limit] Upstash unavailable, allowing request:", error instanceof Error ? error.message : error);
      return { ok: true, remaining: rule.max, retryAfter: 0 };
    }
  }
}

let limiter: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  limiter = url && token ? new UpstashRateLimiter(url, token) : new MemoryRateLimiter();
  return limiter;
}

const relaxed = process.env.APP_ENV === "test" && process.env.E2E_RELAX_RATE_LIMITS === "true";

/** Named rules for app endpoints. Auth endpoints are limited by Better Auth (src/lib/auth.ts). */
export const RULES = {
  /** Claim attempts per user. */
  claimPerUser: { window: 60 * 15, max: relaxed ? 500 : 10 },
  /** Claim attempts per card token, across all users. */
  claimPerCard: { window: 60 * 60, max: relaxed ? 500 : 20 },
  /** Public card and profile lookups per client. */
  publicPerClient: { window: 60, max: relaxed ? 10_000 : 120 },
  /** Contact/enquiry form submissions per client. */
  formPerClient: { window: 60 * 10, max: relaxed ? 500 : 5 },
  /** Checkout sessions started per client. */
  checkoutPerClient: { window: 60 * 10, max: relaxed ? 1000 : 10 },
  /** Basket changes and logo uploads per client. */
  cartPerClient: { window: 60, max: relaxed ? 5000 : 60 },
  /** Profile/photo saves per user. */
  writePerUser: { window: 60, max: relaxed ? 1000 : 30 },
} satisfies Record<string, LimitRule>;

export async function checkLimit(scope: keyof typeof RULES, id: string): Promise<LimitResult> {
  return getRateLimiter().hit(`${scope}:${id}`, RULES[scope]);
}

/**
 * Best-effort client identifier for rate limiting only. Never stored.
 * Trusts x-forwarded-for's first hop, which is correct behind Vercel/most proxies.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
