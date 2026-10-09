import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** 16 random bytes → 22-character base64url token (128 bits). Written to the chip; never changes. */
export function generateCardToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isWellFormedCardToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(token);
}

/** No 0/O, 1/I/L, or U, so codes survive being read off packaging. */
const CLAIM_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CLAIM_LENGTH = 10; // ~49 bits

/** Plain claim code, formatted XXXXX-XXXXX for printing. */
export function generateClaimCode(): string {
  let code = "";
  for (let i = 0; i < CLAIM_LENGTH; i++) code += CLAIM_ALPHABET[randomInt(CLAIM_ALPHABET.length)];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/** Uppercases, strips spaces/dashes, and maps easily confused characters. */
export function normaliseClaimCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

/** HMAC-SHA256 of the normalised code. Only this is stored. */
export function hashClaimCode(code: string, secret: string): string {
  return createHmac("sha256", secret).update(normaliseClaimCode(code)).digest("hex");
}

export function claimCodeMatches(input: string, storedHash: string, secret: string): boolean {
  const a = Buffer.from(hashClaimCode(input, secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
