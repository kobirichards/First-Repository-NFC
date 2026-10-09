import { describe, expect, it } from "vitest";
import { clientKey, trustedIpHeaders } from "@/server/client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("client IP for rate limiting", () => {
  it("on Vercel, uses Vercel's own header and ignores a spoofed x-forwarded-for", () => {
    const env = { VERCEL: "1" };
    expect(trustedIpHeaders(env)).toEqual(["x-vercel-forwarded-for", "x-forwarded-for"]);
    expect(clientKey(h({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.2.3.4" }), env)).toBe("203.0.113.9");
  });

  it("elsewhere, uses the hop the nearest proxy added, not one the client wrote", () => {
    // A client sent "x-forwarded-for: 1.2.3.4"; the proxy appended the real address.
    expect(clientKey(h({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" }), {})).toBe("198.51.100.7");
  });

  it("honours TRUSTED_IP_HEADER", () => {
    const env = { TRUSTED_IP_HEADER: "CF-Connecting-IP" };
    expect(trustedIpHeaders(env)).toEqual(["cf-connecting-ip"]);
    expect(clientKey(h({ "cf-connecting-ip": "192.0.2.1", "x-forwarded-for": "1.2.3.4" }), env)).toBe("192.0.2.1");
  });

  it("falls back to a shared key when no header is present", () => {
    expect(clientKey(h({}), {})).toBe("unknown");
  });
});
