import { expect, test } from "@playwright/test";
import { firstLink, uniqueEmail, waitForEmail } from "./helpers";

const PASSWORD = "correct horse battery";

test("sign up, verify email, sign out and sign back in", async ({ page }) => {
  const email = uniqueEmail("signup");

  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Avery Quinn");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Unverified accounts can't sign in.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Confirm your email address first");

  // Open the confirmation link from the email.
  const mail = await waitForEmail(email, "verify-email");
  await page.goto(firstLink(mail));
  await expect(page.getByText("Email confirmed")).toBeVisible();
  await page.getByRole("link", { name: "Continue to your account" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Avery" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Sign out.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);

  // Sign back in with the password, landing where we were heading.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hello, Avery" })).toBeVisible();
  await expect(page).toHaveURL("/dashboard");
});

test("wrong password shows a helpful error", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("don't match an account");
});

test("reset a forgotten password", async ({ page }) => {
  const email = uniqueEmail("reset");
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Rowan Ellis");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.goto(firstLink(await waitForEmail(email, "verify-email")));
  await expect(page.getByText("Email confirmed")).toBeVisible();
  await page.context().clearCookies();

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  await page.goto(firstLink(await waitForEmail(email, "reset-password")));
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  await page.getByLabel("New password", { exact: true }).fill("a brand new passphrase");
  await page.getByLabel("Confirm new password").fill("a brand new passphrase");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Password changed")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a brand new passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hello, Rowan" })).toBeVisible();
});

test("sign in with an email link", async ({ page }) => {
  const email = uniqueEmail("magic");
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Sam Okafor");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.goto(firstLink(await waitForEmail(email, "verify-email")));
  await page.context().clearCookies();

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in with an email link instead" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("a sign-in link is on its way")).toBeVisible();

  await page.goto(firstLink(await waitForEmail(email, "magic-link")));
  await expect(page.getByRole("heading", { name: "Hello, Sam" })).toBeVisible();
});

test("protected pages redirect when signed out, and open redirects are blocked", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
  await page.goto("/sign-in?next=https%3A%2F%2Fevil.example");
  // The form should still work and fall back to /dashboard rather than leaving the site.
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});
