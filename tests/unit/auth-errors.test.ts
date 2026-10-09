import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

describe("authErrorMessage", () => {
  it("explains rate limiting", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
  });
  it("never reveals internals for unknown errors", () => {
    expect(authErrorMessage({ code: "SOME_DB_ERROR", message: "relation users does not exist" })).toBe(
      "Something went wrong. Try again.",
    );
  });
  it("maps wrong credentials to an actionable message", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toMatch(/reset your password/);
  });
});
