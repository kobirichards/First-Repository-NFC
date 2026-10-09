import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";

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
