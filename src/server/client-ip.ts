/**
 * Which request header carries the real client IP depends on the host.
 * Picking the wrong one lets a visitor fake their IP (and dodge rate limits)
 * by sending the header themselves.
 *
 * - Vercel sets `x-vercel-forwarded-for` itself; clients can't spoof it.
 * - Behind your own proxy (nginx, a load balancer), set TRUSTED_IP_HEADER to
 *   the header it sets. When the header holds a chain, the last hop is used:
 *   that's the address your proxy saw.
 * - Otherwise: the last hop of `x-forwarded-for`.
 */

type Env = Record<string, string | undefined>;

export function trustedIpHeaders(env: Env = process.env): string[] {
  if (env.TRUSTED_IP_HEADER) return [env.TRUSTED_IP_HEADER.toLowerCase()];
  if (env.VERCEL === "1") return ["x-vercel-forwarded-for", "x-forwarded-for"];
  return ["x-forwarded-for"];
}

/** Best-effort client identifier for rate limiting only. Never stored. */
export function clientKey(headers: Headers, env: Env = process.env): string {
  for (const name of trustedIpHeaders(env)) {
    const hops = headers
      .get(name)
      ?.split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const ip = hops?.at(-1);
    if (ip) return ip;
  }
  return "unknown";
}
