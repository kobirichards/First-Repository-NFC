import { describe, expect, it } from "vitest";
import { magicLinkMessage, resetPasswordMessage, verifyEmailMessage } from "@/server/email/templates";

describe("email templates", () => {
  it("includes the action URL in both text and HTML", () => {
    const url = "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=%2Fverified";
    const message = verifyEmailMessage("a@example.com", url);
    expect(message.text).toContain(url);
    expect(message.html).toContain(url.replace(/&/g, "&amp;"));
    expect(message.tag).toBe("verify-email");
  });

  it("escapes HTML in URLs", () => {
    const message = resetPasswordMessage("a@example.com", 'http://x/"><script>alert(1)</script>');
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });

  it("tags each message type", () => {
    expect(magicLinkMessage("a@example.com", "http://x").tag).toBe("magic-link");
    expect(resetPasswordMessage("a@example.com", "http://x").tag).toBe("reset-password");
  });
});
