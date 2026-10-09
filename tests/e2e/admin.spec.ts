import { expect, type Page, test } from "@playwright/test";
import { createAdminAccount, firstLink, query, signIn, signUpAndVerify, totp, waitForEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

const ADMIN_PAGES = [
  "/admin",
  "/admin/orders",
  "/admin/proofs",
  "/admin/batches",
  "/admin/cards",
  "/admin/products",
  "/admin/products/new",
  "/admin/customers",
  "/admin/enquiries",
  "/admin/audit",
];

test("signed-out visitors are sent to sign in; customers get a 404 everywhere in admin", async ({ page, browser }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin/);

  const customer = await (await browser.newContext()).newPage();
  await signUpAndVerify(customer, "Cass Customer", "notadmin");
  for (const path of ADMIN_PAGES) {
    const res = await customer.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(customer.getByRole("heading", { name: "Page not found" }), path).toBeVisible();
  }
  for (const path of ["/admin/batches/x/qr", "/admin/artwork/00000000-0000-4000-8000-000000000000.png"]) {
    expect((await customer.request.get(path)).status(), path).toBe(404);
  }
});

async function enrolMfa(page: Page) {
  await expect(page).toHaveURL(/\/admin\/setup-mfa/);
  await page.getByLabel("Your password").fill("correct horse battery");
  await page.getByRole("button", { name: "Continue" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("I've saved my backup codes").check();
  await page.getByLabel("Code", { exact: true }).fill(totp(secret));
  await page.getByRole("button", { name: "Turn on two-step verification" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  return secret;
}

let adminEmail: string;
let adminSecret: string;

test("an admin must set up two-step verification, then needs a code at every sign-in", async ({ page }) => {
  const admin = await createAdminAccount();
  adminEmail = admin.email;
  await signIn(page, admin.email);
  await page.goto("/admin/orders");
  adminSecret = await enrolMfa(page);

  // Sign out and back in: password alone isn't enough.
  await page.context().clearCookies();
  await signIn(page, admin.email);
  await expect(page).toHaveURL(/\/two-factor/);
  await page.getByLabel(/6-digit code/).fill(totp(adminSecret));
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/dashboard/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  // Email sign-in links are refused for admins (they would skip the code).
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in with an email link instead" }).click();
  await page.getByLabel("Email").fill(admin.email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const refused = await waitForEmail(admin.email, "magic-link-refused");
  expect(refused.text).toContain("Admin accounts can't use email links");
});

test("fulfilment: batch → customer order → proof → assign cards → ship, all audited", async ({ page, browser }) => {
  test.setTimeout(120_000);
  // Admin signs in with password + code.
  await signIn(page, adminEmail);
  await page.getByLabel(/6-digit code/).fill(totp(adminSecret));
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/dashboard/);

  // 1. Generate a batch; the claim-code CSV downloads once.
  await page.goto("/admin/batches");
  await page.getByLabel("Batch name").fill("E2E print run");
  await page.getByLabel("Number of cards").fill("3");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create batch and download CSV" }).click();
  const download = await downloadPromise;
  const csv = await (await download.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString("utf8"));
  const rows = csv.trim().split("\r\n");
  expect(rows[0]).toBe("token,url,claim_code,qr_file");
  expect(rows).toHaveLength(4);
  const qr = await page.request.get((await page.getByRole("link", { name: "QR codes (zip)" }).first().getAttribute("href"))!);
  expect(qr.headers()["content-type"]).toBe("application/zip");

  // 2. A customer buys two printed cards.
  const customer = await (await browser.newContext()).newPage();
  const customerEmail = await signUpAndVerify(customer, "Pat Printed", "printed");
  await customer.goto("/shop/classic");
  await customer.waitForLoadState("networkidle");
  await customer.getByLabel("Print my name, title or logo on the card").check();
  await customer.getByLabel("Name to print").fill("Pat Printed");
  await customer.getByLabel("Quantity").fill("2");
  await customer.getByRole("button", { name: /Add to basket/ }).click();
  await expect(customer.getByText("Added to your basket.")).toBeVisible();
  await customer.goto("/cart");
  await customer.getByRole("button", { name: "Check out securely" }).click();
  await customer.getByRole("button", { name: "Complete simulated payment" }).click();
  const reference = (await customer.locator("strong").filter({ hasText: /^TS-/ }).textContent())!;

  // 3. Admin approves the proof → order moves to production, customer emailed.
  await page.goto("/admin/proofs");
  const proof = page.getByRole("listitem").filter({ hasText: reference });
  await expect(proof.getByText("Pat Printed")).toBeVisible();
  await proof.getByRole("button", { name: "Save decision" }).click();
  // The approved proof leaves the review queue.
  await expect(page.getByRole("listitem").filter({ hasText: reference })).toHaveCount(0);
  const approved = await waitForEmail(customerEmail, "order-update");
  expect(approved.subject).toContain("Your design is approved");

  // 4. Assign two cards from stock: they activate for the customer straight away.
  await page.goto("/admin/orders");
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByText("In production", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Assign cards" }).click();
  await expect(page.getByText("Cards assigned: 2 of 2")).toBeVisible();
  await customer.goto("/dashboard/cards");
  await expect(customer.getByRole("heading", { name: "Unnamed card" })).toHaveCount(2);

  // 5. Ship with tracking; the customer gets the update.
  await page.getByRole("combobox", { name: "Status" }).selectOption("SHIPPED");
  await page.getByLabel("Tracking number").fill("RM123456789GB");
  await page.getByRole("button", { name: "Update order" }).click();
  await expect(page.getByText("Order updated.")).toBeVisible();
  const shipped = await waitForEmail(customerEmail, "order-update");
  expect(shipped.text).toContain("RM123456789GB");

  // 6. Disable one of those cards from admin; it stops resolving.
  await page.reload();
  await page.locator("a[href^='/admin/cards/']").first().click();
  await page.getByRole("button", { name: "Disable card" }).click();
  await expect(page.getByText("Card disabled.")).toBeVisible();
  const [disabled] = await query<{ token: string }>("SELECT token FROM card WHERE status = 'DEACTIVATED' ORDER BY updated_at DESC LIMIT 1");
  expect((await page.request.get(`/c/${disabled.token}`, { maxRedirects: 0 })).headers()["location"]).toMatch(/\/card\/inactive$/);

  // 7. Every step is in the audit log with the admin's name.
  await page.goto("/admin/audit");
  for (const action of ["batch.create", "proof.review", "order.assign_cards", "order.status", "card.disable"]) {
    await expect(page.getByRole("cell", { name: action, exact: true }).first(), action).toBeVisible();
  }
  await expect(page.getByRole("cell", { name: adminEmail }).first()).toBeVisible();
  void firstLink;
});

test("price changes in admin show in the shop", async ({ page }) => {
  await signIn(page, adminEmail);
  await page.getByLabel(/6-digit code/).fill(totp(adminSecret));
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Classic card" }).click();
  const productPrices = page.getByRole("main").locator("form").filter({ hasText: "Product price (used when" });
  await productPrices.getByLabel("GBP").fill("25.50");
  await productPrices.getByRole("button", { name: "Save prices" }).click();
  await expect(productPrices.getByText("Prices saved.")).toBeVisible();
  await page.goto("/shop/classic");
  await expect(page.getByText("£25.50").first()).toBeVisible();
});
