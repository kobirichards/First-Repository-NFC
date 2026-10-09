import { expect, test } from "@playwright/test";
import { signUpAndVerify } from "./helpers";

test("every page sends the security headers and no framework fingerprint", async ({ request }) => {
  for (const path of ["/", "/shop", "/sign-in", "/api/auth/get-session"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["content-security-policy"], path).toContain("default-src 'self'");
    expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"], path).toContain("object-src 'none'");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"], path).toContain("camera=()");
    expect(h["strict-transport-security"], path).toContain("max-age=");
    expect(h["x-powered-by"], path).toBeUndefined();
  }
});

test("other websites can't read API responses (no CORS)", async ({ request }) => {
  const origin = "https://attacker.example";
  const get = await request.get("/api/auth/get-session", { headers: { Origin: origin } });
  expect(get.headers()["access-control-allow-origin"]).toBeUndefined();

  const preflight = await request.fetch("/api/auth/sign-in/email", {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
  });
  expect(preflight.headers()["access-control-allow-origin"]).toBeUndefined();

  // A sign-in posted from another site is refused before credentials are checked.
  const post = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin, "Content-Type": "application/json" },
    data: { email: "demo@example.com", password: "demo-password-123" },
  });
  expect(post.status()).toBe(403);
  expect(post.headers()["set-cookie"] ?? "").not.toContain("session_token");
});

test("source files, secrets and uploads aren't served", async ({ request }) => {
  for (const path of [
    "/.env",
    "/.env.example",
    "/.git/config",
    "/.git/HEAD",
    "/package.json",
    "/next.config.ts",
    "/src/lib/auth.ts",
    "/drizzle/0000_init.sql",
    "/.uploads/profile/x.webp",
    "/.mail-outbox/",
    "/media/../.env",
    "/media/artwork/x.png", // logos are admin-only, via /admin/artwork
  ]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect([404, 307, 308], path).toContain(res.status());
    expect(await res.text(), path).not.toMatch(/BETTER_AUTH_SECRET|DATABASE_URL|\[core\]|"dependencies"/);
  }
});

test("production JavaScript ships without source maps", async ({ page, request }) => {
  await page.goto("/");
  const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts.slice(0, 5)) {
    const js = await (await request.get(src)).text();
    expect(js, src).not.toContain("sourceMappingURL=");
    expect((await request.get(`${src}.map`)).status(), src).toBe(404);
  }
});

test("private downloads need the right account", async ({ request }) => {
  expect((await request.get("/api/account/export")).status()).toBe(401);
  expect((await request.get("/api/cards/some-card-id/qr")).status()).toBe(401);
  // Signed-out visitors to admin URLs are sent to sign in; nothing is downloaded.
  for (const path of ["/admin/batches/some-batch/qr", "/admin/artwork/x.png"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect([307, 404], path).toContain(res.status());
    expect(res.headers()["content-type"] ?? "", path).not.toMatch(/zip|image/);
  }
  // Unsigned webhooks are rejected.
  const hook = await request.post("/api/webhooks/stripe", { data: "{}", headers: { "Content-Type": "application/json" } });
  expect([400, 503]).toContain(hook.status());
});

test("text typed into a profile is shown as text, never run as code", async ({ page }) => {
  const payload = `<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
  page.on("dialog", (dialog) => void dialog.dismiss());
  await signUpAndVerify(page, "Xavier Script", "xss");
  await page.goto("/dashboard/profile");
  await page.getByLabel("Job title").fill(payload.slice(0, 80));
  await page.getByLabel("Company").fill("\"><svg onload=window.__xss=1>");
  await page.getByLabel("Address", { exact: true }).fill(`xss-${Date.now()}`);
  const slug = await page.getByLabel("Address", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.getByRole("button", { name: "Publish profile" }).click();
  await expect(page.getByRole("button", { name: "Take profile offline" })).toBeVisible();

  await page.goto(`/p/${slug}`);
  await expect(page.getByRole("main")).toContainText("<img src=x");
  expect(await page.locator("main img[src='x'], main svg[onload]").count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});
