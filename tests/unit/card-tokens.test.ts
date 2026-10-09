import { describe, expect, it } from "vitest";
import {
  claimCodeMatches,
  generateCardToken,
  generateClaimCode,
  hashClaimCode,
  isWellFormedCardToken,
  normaliseClaimCode,
} from "@/server/cards/tokens";

const SECRET = "test-secret";

describe("card tokens", () => {
  it("are 22 url-safe characters (128 bits) and unique", () => {
    const tokens = new Set(Array.from({ length: 2000 }, generateCardToken));
    expect(tokens.size).toBe(2000);
    for (const t of tokens) expect(isWellFormedCardToken(t)).toBe(true);
  });

  it("rejects malformed tokens", () => {
    expect(isWellFormedCardToken("short")).toBe(false);
    expect(isWellFormedCardToken("../../etc/passwd/aaaaaa")).toBe(false);
    expect(isWellFormedCardToken("a".repeat(23))).toBe(false);
  });
});

describe("claim codes", () => {
  it("use the unambiguous alphabet in XXXXX-XXXXX form", () => {
    for (let i = 0; i < 500; i++) expect(generateClaimCode()).toMatch(/^[A-HJKMNP-TV-Z2-9]{5}-[A-HJKMNP-TV-Z2-9]{5}$/);
  });

  it("match regardless of case, spacing and dashes", () => {
    const code = generateClaimCode();
    const hash = hashClaimCode(code, SECRET);
    expect(claimCodeMatches(code.toLowerCase(), hash, SECRET)).toBe(true);
    expect(claimCodeMatches(code.replace("-", " "), hash, SECRET)).toBe(true);
    expect(claimCodeMatches(` ${code.replace("-", "")} `, hash, SECRET)).toBe(true);
  });

  it("do not match a different code or secret", () => {
    const hash = hashClaimCode("ABCDE-FGHJK", SECRET);
    expect(claimCodeMatches("ABCDE-FGHJM", hash, SECRET)).toBe(false);
    expect(claimCodeMatches("ABCDE-FGHJK", hash, "other-secret")).toBe(false);
  });

  it("never store the plain code", () => {
    expect(hashClaimCode("ABCDE-FGHJK", SECRET)).not.toContain("ABCDE");
    expect(normaliseClaimCode("abcde-fghjk")).toBe("ABCDEFGHJK");
  });
});
