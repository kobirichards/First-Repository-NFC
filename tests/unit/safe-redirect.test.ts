import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it("allows same-site relative paths", () => {
    expect(safeNextPath("/dashboard/cards")).toBe("/dashboard/cards");
    expect(safeNextPath("/activate/abc?x=1")).toBe("/activate/abc?x=1");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "dashboard",
    "/ok\r\nSet-Cookie: x=1",
  ])("rejects %s", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });

  it("uses the fallback when empty", () => {
    expect(safeNextPath(null, "/x")).toBe("/x");
    expect(safeNextPath("", "/x")).toBe("/x");
  });
});
