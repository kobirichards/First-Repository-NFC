import { describe, expect, it } from "vitest";
import { buildVCard, escapeVCardText, vcardFilename } from "@/lib/vcard";

describe("vCard", () => {
  it("escapes separators and newlines so values can't inject properties", () => {
    expect(escapeVCardText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
    const card = buildVCard({ displayName: "Eve", company: "Acme\nEMAIL:evil@example.com", profileUrl: "https://x.test/p/eve" });
    expect(card).not.toMatch(/^EMAIL:evil/m);
    expect(card).toContain("ORG:Acme\\nEMAIL:evil@example.com");
  });

  it("strips control characters", () => {
    expect(escapeVCardText("a\u0000b\u0007c")).toBe("abc");
  });

  it("includes only the fields given, with CRLF line endings", () => {
    const card = buildVCard({ displayName: "Jordan Patel", jobTitle: "Head of Partnerships", profileUrl: "https://x.test/p/jordan" });
    expect(card).toContain("N:Patel;Jordan;;;\r\n");
    expect(card).toContain("FN:Jordan Patel\r\n");
    expect(card).toContain("TITLE:Head of Partnerships");
    expect(card).not.toContain("EMAIL");
    expect(card).not.toContain("TEL");
    expect(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(card.endsWith("END:VCARD\r\n")).toBe(true);
  });

  it("folds long lines at 75 octets", () => {
    const card = buildVCard({ displayName: "A", note: "x".repeat(300), profileUrl: "https://x.test/p/a" });
    for (const line of card.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });

  it("makes safe filenames", () => {
    expect(vcardFilename('Zoë "O\'Brien"')).toBe("Zoe-OBrien.vcf");
    expect(vcardFilename("../../etc")).toBe("etc.vcf");
    expect(vcardFilename("李")).toBe("contact.vcf");
  });
});
