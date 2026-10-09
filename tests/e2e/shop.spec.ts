import { expect, test } from "@playwright/test";
import { query, signUpAndVerify, uniqueEmail, waitForEmail } from "./helpers";

test("signed-in purchase: choose a card, switch currency, pay, see the order", async ({ page }) => {
  const email = await signUpAndVerify(page, "Sofia Shopper", "shopper");

  await page.goto("/shop");
  await page.getByRole("link", { name: /Classic card/ }).first().click();
  await expect(page.getByRole("heading", { name: "Classic card" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Option prices override the product price; the button shows the live total.
  await page.getByLabel(/Bottle green/).check();
  await page.getByLabel("Quantity").fill("2");
  await expect(page.getByRole("button", { name: "Add to basket: £52" })).toBeVisible();
  await page.getByRole("button", { name: /Add to basket/ }).click();
  await expect(page.getByText("Added to your basket.")).toBeVisible();

  // Switch to euros: the basket is repriced from the fixed EUR price list.
  await page.goto("/cart");
  await page.getByLabel("Currency").selectOption("EUR");
  await expect(page.getByText("Subtotal (2 cards)")).toBeVisible();
  await expect(page.getByRole("complementary").getByText("€56")).toBeVisible();
  await expect(page.getByText("Prices include VAT.")).toBeVisible();

  // Back to pounds for the purchase.
  await page.getByLabel("Currency").selectOption("GBP");
  await expect(page.getByRole("complementary").getByText("£52")).toBeVisible();

  await page.getByRole("button", { name: "Check out securely" }).click();
  await expect(page.getByText("Simulated checkout: no payment is taken")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Next working day").check();
  await page.getByRole("button", { name: "Complete simulated payment" }).click();

  await expect(page.getByRole("heading", { name: /Your order is confirmed/ })).toBeVisible();
  const reference = (await page.locator("strong").filter({ hasText: /^TS-/ }).textContent())!;
  expect(reference).toMatch(/^TS-[A-Z0-9]{6}$/);

  const mail = await waitForEmail(email, "order-confirmation");
  expect(mail.subject).toBe(`Order ${reference} confirmed`);
  expect(mail.text).toContain("2 × Classic card, Bottle green: £52");
  expect(mail.text).toContain("Delivery: £6.95");
  expect(mail.text).toContain("Total paid: £58.95");

  // Basket is empty after payment; order is in the account.
  await page.goto("/cart");
  await expect(page.getByText("Your basket is empty")).toBeVisible();
  await page.goto("/dashboard/orders");
  await page.getByRole("link", { name: new RegExp(reference) }).click();
  await expect(page.getByRole("heading", { name: `Order ${reference}` })).toBeVisible();
  await expect(page.getByText("2 × Classic card, Bottle green")).toBeVisible();
  await expect(page.getByText("£58.95").first()).toBeVisible();

  const [row] = await query<{ status: string; total: number; shipping: number }>("SELECT status, total, shipping FROM \"order\" WHERE reference = $1", [reference]);
  expect(row).toEqual({ status: "PAID", total: 5895, shipping: 695 });
});

test("guest purchase with printed name goes to proof, and the success page is private", async ({ page, browser }) => {
  await page.goto("/shop/classic");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Matte black/).check();
  await page.getByLabel("Print my name, title or logo on the card").check();
  await page.getByLabel("Name to print").fill("Grace Guest");
  await page.getByRole("button", { name: /Add to basket/ }).click();
  await expect(page.getByText("Added to your basket.")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText("Printed name: Grace Guest")).toBeVisible();
  await page.getByRole("button", { name: "Check out securely" }).click();
  const guestEmail = uniqueEmail("guest");
  await page.getByLabel("Email").fill(guestEmail);
  await page.getByRole("button", { name: "Complete simulated payment" }).click();
  await expect(page.getByText(/we'll send a proof of your printed design/)).toBeVisible();
  const successUrl = page.url();
  await waitForEmail(guestEmail, "order-confirmation");

  // Someone else with the same link sees nothing about the order.
  const stranger = await (await browser.newContext()).newPage();
  await stranger.goto(successUrl);
  await expect(stranger.getByRole("heading", { name: "Order status" })).toBeVisible();
  await expect(stranger.getByText(/TS-/)).toHaveCount(0);
});

test("cancelling checkout keeps the basket and charges nothing", async ({ page }) => {
  await page.goto("/shop/classic");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Add to basket/ }).click();
  await expect(page.getByText("Added to your basket.")).toBeVisible();
  await page.goto("/cart");
  await page.getByRole("button", { name: "Check out securely" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/cart\?cancelled=1/);
  await expect(page.getByText("Checkout cancelled")).toBeVisible();
  await expect(page.getByRole("link", { name: "Classic card, Matte black" })).toBeVisible();
});

test("basket quantity limits are explained", async ({ page }) => {
  await page.goto("/shop/classic");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Add to basket/ }).click();
  await expect(page.getByText("Added to your basket.")).toBeVisible();
  await page.goto("/cart");
  await page.getByLabel("Quantity").fill("500");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("team quote");
});

test("team enquiry: validates, then saves and notifies", async ({ page }) => {
  await page.goto("/teams");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Enter your company name.")).toBeVisible();
  await expect(page.getByText("Choose a timeline.")).toBeVisible();

  const email = uniqueEmail("buyer");
  const form = page.getByRole("main");
  await form.getByLabel("Company").fill("Acme Events");
  await form.getByLabel("Your name").fill("Tom Team");
  await form.getByLabel("Work email").fill(email);
  await form.getByLabel("Roughly how many cards?").fill("120");
  await form.getByLabel("When do you need them?").selectOption("Within a month");
  await form.getByLabel("What do you need?").fill("Cards for our sales team before a trade show in Berlin.");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Enquiry sent")).toBeVisible();

  const rows = await query<{ company: string; quantity: number; status: string }>("SELECT company, quantity, status FROM enquiry WHERE email = $1", [email]);
  expect(rows).toEqual([{ company: "Acme Events", quantity: 120, status: "NEW" }]);
});
