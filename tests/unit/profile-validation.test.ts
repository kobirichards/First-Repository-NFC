import { describe, expect, it } from "vitest";
import { normaliseLinkedInUrl, safeExternalUrl } from "@/lib/urls";
import { profileInputSchema, slugFromName } from "@/lib/validation/profile";

const base = { slug: "jane-smith", displayName: "Jane Smith" };
const parse = (extra: Record<string, unknown>) => profileInputSchema.safeParse({ ...base, ...extra });
const firstError = (extra: Record<string, unknown>) => {
  const r = parse(extra);
  return r.success ? null : r.error.issues[0];
};

describe("safeExternalUrl", () => {
  it.each(["javascript:alert(1)", "data:text/html,<script>", "JaVaScRiPt:alert(1)", "vbscript:x", "file:///etc/passwd", "mailto:x@y.z", "not a url"])(
    "rejects %s",
    (v) => expect(safeExternalUrl(v)).toBeNull(),
  );
  it("rejects credentials in URLs", () => expect(safeExternalUrl("https://user:pass@example.com")).toBeNull());
  it("accepts http and https", () => {
    expect(safeExternalUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com/");
  });
});

describe("LinkedIn URLs", () => {
  it("accepts LinkedIn profile URLs and strips tracking", () => {
    expect(normaliseLinkedInUrl("https://www.linkedin.com/in/jane?utm_source=x#top")).toBe("https://www.linkedin.com/in/jane");
    expect(normaliseLinkedInUrl("linkedin.com/in/jane")).toBe("https://linkedin.com/in/jane");
    expect(normaliseLinkedInUrl("https://uk.linkedin.com/in/jane")).toBe("https://uk.linkedin.com/in/jane");
  });
  it.each(["https://linkedin.com.evil.example/in/jane", "https://evillinkedin.com/in/jane", "https://www.linkedin.com/", "javascript:alert(1)//linkedin.com/in/x"])(
    "rejects %s",
    (v) => expect(normaliseLinkedInUrl(v)).toBeNull(),
  );
  it("the form rejects plain http with a specific message", () => {
    expect(firstError({ linkedinUrl: "http://www.linkedin.com/in/jane" })?.message).toMatch(/https/);
  });
});

describe("profile input", () => {
  it("normalises optional empties to undefined and checkboxes to booleans", () => {
    const r = profileInputSchema.parse({ ...base, jobTitle: "", website: "", showEmail: "on" });
    expect(r.jobTitle).toBeUndefined();
    expect(r.website).toBeUndefined();
    expect(r.showEmail).toBe(true);
    expect(r.showPhone).toBe(false);
  });
  it("adds https:// to bare website domains", () => {
    expect(profileInputSchema.parse({ ...base, website: "company.com" }).website).toBe("https://company.com/");
  });
  it("rejects bad websites, emails, phones and slugs", () => {
    expect(firstError({ website: "javascript:alert(1)" })?.path).toEqual(["website"]);
    expect(firstError({ email: "nope" })?.path).toEqual(["email"]);
    expect(firstError({ phone: "call me" })?.path).toEqual(["phone"]);
    expect(firstError({ slug: "Jane Smith!" })?.path).toEqual(["slug"]);
    expect(firstError({ slug: "admin" })?.message).toMatch(/reserved/);
    expect(firstError({ slug: "a" })?.path).toEqual(["slug"]);
  });
  it("lowercases slugs", () => expect(profileInputSchema.parse({ ...base, slug: "Jane-Smith" }).slug).toBe("jane-smith"));
});

describe("slugFromName", () => {
  it("handles accents, apostrophes and short names", () => {
    expect(slugFromName("Zoë O'Brien")).toBe("zoe-obrien");
    expect(slugFromName("Al")).toBe("al-profile");
    expect(slugFromName("李")).toBe("card-profile");
  });
});
