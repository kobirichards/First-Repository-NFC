import { describe, expect, it, vi } from "vitest";
import { MemoryRateLimiter } from "@/server/rate-limit";

describe("MemoryRateLimiter", () => {
  it("allows up to max hits per window, then blocks with a retry time", async () => {
    const limiter = new MemoryRateLimiter();
    const rule = { window: 60, max: 3 };
    for (let i = 0; i < 3; i++) expect((await limiter.hit("k", rule)).ok).toBe(true);
    const blocked = await limiter.hit("k", rule);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect((await limiter.hit("other", rule)).ok).toBe(true);
  });

  it("resets after the window", async () => {
    vi.useFakeTimers();
    const limiter = new MemoryRateLimiter();
    const rule = { window: 1, max: 1 };
    expect((await limiter.hit("k", rule)).ok).toBe(true);
    expect((await limiter.hit("k", rule)).ok).toBe(false);
    vi.advanceTimersByTime(1100);
    expect((await limiter.hit("k", rule)).ok).toBe(true);
    vi.useRealTimers();
  });
});
