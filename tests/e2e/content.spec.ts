import { expect, test } from "@playwright/test";
import { query, uniqueEmail } from "./helpers";

test("legal pages carry the draft banner; info pages load", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/cookies", "/shipping-returns"]) {
    await page.goto(path);
    await expect(page.getByRole("note"), path).toHaveText("Draft — requires review by a qualified professional before launch.");
  }
  for (const path of ["/about", "/contact"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});

test("home page labels the testimonial section as a placeholder", async ({ page }) => {
  await page.goto("/");
  const stories = page.getByRole("region", { name: "What customers say" });
  await expect(stories.getByText("Placeholder", { exact: true })).toBeVisible();
});

test("contact form saves the message", async ({ page }) => {
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
  const email = uniqueEmail("contact");
  const main = page.getByRole("main");
  await main.getByLabel("Your name").fill("Chris Contact");
  await main.getByLabel("Email").fill(email);
  await main.getByLabel(/Order reference/).fill("ts-abc123");
  await main.getByLabel("Message").fill("My card won't open on my old phone.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Message sent")).toBeVisible();
  const [row] = await query<{ kind: string; message: string }>("SELECT kind, message FROM enquiry WHERE email = $1", [email]);
  expect(row.kind).toBe("contact");
  expect(row.message).toContain("Order: TS-ABC123");
});

test("robots.txt keeps private areas out; sitemap lists public pages and products only", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/dashboard", "/admin", "/c/", "/api/"]) expect(robots).toContain(`Disallow: ${path}`);
  expect(robots).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/); // APP_URL is baked in at build time

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>http://localhost:3100/shop/classic</loc>");
  expect(sitemap).toContain("<loc>http://localhost:3100/privacy</loc>");
  expect(sitemap).not.toContain("/dashboard");
  expect(sitemap).not.toMatch(/\/p\/(?!$)/); // no profiles unless their owners opted in
});

test("pages have titles, descriptions and a social image", async ({ page, request }) => {
  await page.goto("/shop");
  await expect(page).toHaveTitle(/Shop NFC business cards/);
  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(og).toContain("/opengraph-image");
  expect((await request.get(new URL(og!).pathname)).headers()["content-type"]).toBe("image/png");
});
