import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { hashPassword } from "better-auth/crypto";
import path from "node:path";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { Pool } from "pg";
import { generateCardToken, generateClaimCode, hashClaimCode } from "../../src/server/cards/tokens";

const OUTBOX = ".e2e-outbox";

type Mail = { to: string; subject: string; text: string; html: string; tag: string };

/** Waits for the newest email of a given type sent to `to`, and returns it. */
export async function waitForEmail(to: string, tag: string, timeoutMs = 10_000): Promise<Mail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((f) => f.includes(`-${tag}-`)).sort().reverse();
    for (const file of files) {
      const mail = JSON.parse(await readFile(path.join(OUTBOX, file), "utf8")) as Mail;
      if (mail.to === to) return mail;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No "${tag}" email for ${to} within ${timeoutMs}ms`);
}

export function firstLink(mail: Mail): string {
  const match = mail.text.match(/https?:\/\/\S+/);
  expect(match, "email contains a link").toBeTruthy();
  return match![0];
}

export function uniqueEmail(prefix = "user") {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}


export const PASSWORD = "correct horse battery";
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nfc_test";
const CLAIM_SECRET = "e2e-only-claim-secret-0123456789abcdef0123"; // matches playwright.config.ts

/** Inserts a fresh unclaimed card, as a printer batch would. */
export async function createUnclaimedCard() {
  const token = generateCardToken();
  const code = generateClaimCode();
  const pool = new Pool({ connectionString: TEST_DB });
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO card (id, token, claim_code_hash) VALUES ($1, $2, $3) RETURNING id",
    [crypto.randomUUID(), token, hashClaimCode(code, CLAIM_SECRET)],
  );
  await pool.end();
  return { id: rows[0].id, token, code };
}

export async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: TEST_DB });
  const { rows } = await pool.query<T>(sql, params);
  await pool.end();
  return rows;
}

/** Creates and verifies an account, leaving the page signed in on the dashboard. */
export async function signUpAndVerify(page: Page, name: string, prefix = "user") {
  const email = uniqueEmail(prefix);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(firstLink(await waitForEmail(email, "verify-email")));
  await expect(page.getByText("Email confirmed")).toBeVisible();
  return email;
}

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits), for signing in as an admin in tests. */
export function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32Secret.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** A verified admin account with a password and no two-step verification yet (as `npm run admin:create` makes). */
export async function createAdminAccount() {
  const email = uniqueEmail("admin");
  const id = crypto.randomUUID();
  await query('INSERT INTO "user" (id, name, email, email_verified, role) VALUES ($1, $2, $3, true, $4)', [id, "Ada Admin", email, "admin"]);
  await query("INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, 'credential', $2, $3)", [
    crypto.randomUUID(),
    id,
    await hashPassword(PASSWORD),
  ]);
  return { id, email };
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
}
