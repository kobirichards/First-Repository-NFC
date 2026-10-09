import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { PASSWORD, createUnclaimedCard, query, signUpAndVerify } from "./helpers";

test.describe.configure({ mode: "serial" });

test("claim a card, build and publish a profile, and tap through every card state", async ({ page, request }) => {
  await signUpAndVerify(page, "Priya Shah", "journey");
  const card = await createUnclaimedCard();

  // Tapping a new card leads to activation.
  await page.goto(`/c/${card.token}`);
  await expect(page).toHaveURL(`/activate/${card.token}`);
  await expect(page.getByRole("heading", { name: "Activate your card" })).toBeVisible();

  // Wrong code first.
  await page.getByLabel("Claim code").fill("AAAAA-BBBBB");
  await page.getByRole("button", { name: "Activate card" }).click();
  await expect(page.getByText("doesn't match this card")).toBeVisible();

  // Right code, typed loosely.
  await page.getByLabel("Claim code").fill(card.code.toLowerCase().replace("-", " "));
  await page.getByRole("button", { name: "Activate card" }).click();
  await expect(page).toHaveURL("/dashboard/cards?claimed=1");
  await expect(page.getByText("Card activated")).toBeVisible();

  // Claimed but profile not published yet.
  await page.goto(`/c/${card.token}`);
  await expect(page).toHaveURL("/card/not-ready");

  // Fill in the profile.
  await page.goto("/dashboard/profile");
  await page.getByLabel("Job title").fill("Director of Sales");
  await page.getByLabel("Company").fill("Example Ltd");
  await page.getByLabel("LinkedIn profile address").fill("linkedin.com/in/priya-example?utm_source=share");
  await page.getByLabel("Work email").fill("priya@example.com");
  await page.getByLabel("Business phone").fill("+44 20 7946 0123");
  // Show email, keep the phone hidden (the default).
  await page.getByRole("group", { name: "Contact details" }).getByLabel("Show on my public profile").nth(1).check();
  await page.getByLabel("Address", { exact: true }).fill(`priya-${Date.now()}`);
  const slug = await page.getByLabel("Address", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await expect(page.getByLabel("LinkedIn profile address")).toHaveValue("https://linkedin.com/in/priya-example");

  // Upload a photo carrying GPS data.
  await page.locator('input[type="file"][name="photo"]').setInputFiles("tests/e2e/fixtures/photo-with-gps.jpg");
  await expect(page.getByText("Photo updated.")).toBeVisible();

  // Unpublished profiles aren't visible to the public.
  expect((await request.get(`/p/${slug}`)).status()).toBe(404);

  await page.getByRole("button", { name: "Publish profile" }).click();
  await expect(page.getByRole("button", { name: "Take profile offline" })).toBeVisible();

  // Tap → profile.
  await page.goto(`/c/${card.token}`);
  await expect(page).toHaveURL(`/p/${slug}`);
  await expect(page.getByRole("heading", { name: "Priya Shah" })).toBeVisible();
  await expect(page.getByText("Director of Sales at Example Ltd")).toBeVisible();
  await expect(page.getByRole("link", { name: "Connect on LinkedIn" })).toHaveAttribute("href", "https://linkedin.com/in/priya-example");
  await expect(page.getByRole("link", { name: "Connect on LinkedIn" })).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText("priya@example.com")).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("7946 0123"); // hidden phone never reaches the page

  // The served photo has no EXIF/GPS left.
  const photoSrc = await page.locator("article img").getAttribute("src");
  const photo = await request.get(photoSrc!);
  expect(photo.headers()["content-type"]).toBe("image/webp");
  const meta = await sharp(Buffer.from(await photo.body())).metadata();
  expect(meta.exif).toBeUndefined();
  expect(meta.width).toBe(512);

  // vCard: public fields only.
  const vcard = await (await request.get(`/p/${slug}/vcard`)).text();
  expect(vcard).toContain("FN:Priya Shah");
  expect(vcard).toContain("EMAIL;TYPE=INTERNET,WORK:priya@example.com");
  expect(vcard).not.toContain("TEL");

  // The resolver uses temporary, uncacheable redirects.
  const tap = await request.get(`/c/${card.token}`, { maxRedirects: 0 });
  expect(tap.status()).toBe(307);
  expect(tap.headers()["cache-control"]).toContain("no-store");

  // Switch the card to LinkedIn.
  await page.goto("/dashboard/cards");
  await page.getByLabel("Go straight to my LinkedIn").check();
  await expect(page.getByText("This card now opens your LinkedIn.")).toBeVisible();
  const toLinkedIn = await request.get(`/c/${card.token}`, { maxRedirects: 0 });
  expect(toLinkedIn.status()).toBe(307);
  expect(toLinkedIn.headers()["location"]).toBe("https://linkedin.com/in/priya-example");

  // Lose it, deactivate it.
  await page.getByRole("button", { name: "Lost this card? Deactivate it" }).click();
  await expect(page.getByText("doesn't erase the chip")).toBeVisible();
  await page.getByRole("button", { name: "Deactivate card" }).click();
  await expect(page.getByRole("button", { name: "Reactivate card" })).toBeVisible();
  await page.goto(`/c/${card.token}`);
  await expect(page).toHaveURL("/card/inactive");

  // Found it again.
  await page.goto("/dashboard/cards");
  await page.getByRole("button", { name: "Reactivate card" }).click();
  await expect(page.getByText("Card reactivated.")).toBeVisible();
  expect((await request.get(`/c/${card.token}`, { maxRedirects: 0 })).headers()["location"]).toBe(
    "https://linkedin.com/in/priya-example",
  );

  // QR download is the card's permanent URL.
  const qr = await page.request.get(`/api/cards/${card.id}/qr?format=svg`);
  expect(qr.status()).toBe(200);
  expect(qr.headers()["content-type"]).toBe("image/svg+xml");
});

test("another user can't touch someone else's card or private photo", async ({ browser }) => {
  // Owner: claims a card and uploads a photo but doesn't publish.
  const ownerPage = await (await browser.newContext()).newPage();
  await signUpAndVerify(ownerPage, "Olivia Owner", "owner");
  const card = await createUnclaimedCard();
  await ownerPage.goto(`/activate/${card.token}`);
  await ownerPage.getByLabel("Claim code").fill(card.code);
  await ownerPage.getByRole("button", { name: "Activate card" }).click();
  await expect(ownerPage).toHaveURL(/\/dashboard\/cards/);
  await ownerPage.goto("/dashboard/profile");
  await ownerPage.waitForLoadState("networkidle"); // let React hydrate before picking a file
  await ownerPage.locator('input[type="file"][name="photo"]').setInputFiles("tests/e2e/fixtures/photo-with-gps.jpg");
  await expect(ownerPage.getByText("Photo updated.")).toBeVisible();
  const photoSrc = await ownerPage.getByRole("img", { name: "Your profile photo" }).getAttribute("src");
  expect((await ownerPage.request.get(photoSrc!)).status()).toBe(200);

  // Intruder.
  const intruderContext = await browser.newContext();
  const intruder = await intruderContext.newPage();
  await signUpAndVerify(intruder, "Ivan Intruder", "intruder");

  expect((await intruder.request.get(`/api/cards/${card.id}/qr?format=svg`)).status()).toBe(404);
  expect((await intruder.request.get(photoSrc!)).status()).toBe(404);

  await intruder.goto(`/activate/${card.token}`);
  await expect(intruder.getByRole("heading", { name: "This card can't be activated" })).toBeVisible();

  await intruder.goto("/dashboard/cards");
  await expect(intruder.getByText("No cards yet")).toBeVisible();

  // Anonymous visitors can't see the unpublished photo either.
  const anon = await browser.newContext();
  expect((await anon.request.get(photoSrc!)).status()).toBe(404);
  await anon.close();
  await intruderContext.close();
});

test("rejects files that aren't images", async ({ page }) => {
  await signUpAndVerify(page, "Una Upload", "upload");
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="file"][name="photo"]').setInputFiles("tests/e2e/fixtures/not-an-image.jpg");
  await expect(page.getByText("isn't an image we can read")).toBeVisible();
});

test("rejects unsafe links in the profile", async ({ page }) => {
  await signUpAndVerify(page, "Lena Links", "links");
  await page.goto("/dashboard/profile");
  await page.getByLabel("Website").fill("javascript:alert(1)");
  await page.getByLabel("LinkedIn profile address").fill("https://linkedin.com.evil.example/in/x");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Enter a web address, like https://company.com.")).toBeVisible();
  await expect(page.getByText("Enter your LinkedIn profile address")).toBeVisible();
  // What the user typed is kept so they can fix it.
  await expect(page.getByLabel("Website")).toHaveValue("javascript:alert(1)");
});

test("download my data, then delete the account and its cards stop working", async ({ page, request }) => {
  const email = await signUpAndVerify(page, "Dana Delete", "delete");
  const card = await createUnclaimedCard();
  await page.goto(`/activate/${card.token}`);
  await page.getByLabel("Claim code").fill(card.code);
  await page.getByRole("button", { name: "Activate card" }).click();
  await expect(page).toHaveURL(/\/dashboard\/cards/);

  await page.goto("/dashboard/account");
  const exportRes = await page.request.get("/api/account/export");
  expect(exportRes.status()).toBe(200);
  const data = await exportRes.json();
  expect(data.account.email).toBe(email);
  expect(data.cards).toHaveLength(1);
  const raw = JSON.stringify(data);
  expect(raw).not.toMatch(/password|claimCodeHash|"token":"[^"]{30,}"/i);

  await page.getByLabel("Password", { exact: true }).last().fill(PASSWORD);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?deleted=1/);

  expect(await query("SELECT id FROM \"user\" WHERE email = $1", [email])).toHaveLength(0);
  const [row] = await query<{ status: string; owner_id: string | null }>("SELECT status, owner_id FROM card WHERE token = $1", [card.token]);
  expect(row).toEqual({ status: "DEACTIVATED", owner_id: null });
  expect((await request.get(`/c/${card.token}`, { maxRedirects: 0 })).headers()["location"]).toMatch(/\/card\/inactive$/);
});
