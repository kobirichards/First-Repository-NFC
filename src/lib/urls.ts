/**
 * Returns a normalised http(s) URL string, or null for anything else
 * (javascript:, data:, mailto:, malformed…). Use on every user-supplied link
 * at render time as well as on input.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Adds https:// when the user typed a bare domain. */
export function withScheme(value: string): string {
  const trimmed = value.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isLinkedInHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

/** Strips tracking query strings and fragments from LinkedIn URLs. */
export function normaliseLinkedInUrl(value: string): string | null {
  const safe = safeExternalUrl(withScheme(value));
  if (!safe) return null;
  const url = new URL(safe);
  if (url.protocol !== "https:" || !isLinkedInHost(url.hostname)) return null;
  if (url.pathname === "/" || url.pathname === "") return null;
  url.search = "";
  url.hash = "";
  return url.toString();
}
