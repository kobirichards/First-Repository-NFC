import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { query, signUpAndVerify } from "./helpers";

/** WCAG 2.0/2.1/2.2 A and AA rules. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const PUBLIC_PAGES = [
  "/",
  "/shop",
  "/shop/classic",
  "/cart",
  "/teams",
  "/about",
  "/contact",
  "/shipping-returns",
  "/privacy",
  "/terms",
  "/cookies",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/card/inactive",
  "/card/not-ready",
];

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, `${path} accessibility violations`).toEqual([]);
}

for (const path of PUBLIC_PAGES) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await audit(page, path);
  });
}

test("no WCAG A/AA violations on a public profile and the signed-in pages", async ({ page }) => {
  test.setTimeout(90_000);
  const email = await signUpAndVerify(page, "Ally Access", "a11y");
  await page.goto("/dashboard/profile"); // creates the draft profile
  await page.waitForLoadState("networkidle");
  const slug = `ally-${Date.now()}`;
  await query(
    `UPDATE profile SET slug = $1, is_published = true, job_title = 'Accessibility lead', company = 'Example Ltd',
       linkedin_url = 'https://www.linkedin.com/in/ally', email = $2, show_email = true, bio = 'Making things usable.'
     WHERE user_id = (SELECT id FROM "user" WHERE email = $2)`,
    [slug, email],
  );
  for (const path of [`/p/${slug}`, "/dashboard", "/dashboard/profile", "/dashboard/profile/preview", "/dashboard/cards", "/dashboard/orders", "/dashboard/account"]) {
    await audit(page, path);
  }
});

test("keyboard: skip link and visible focus on the home page", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
