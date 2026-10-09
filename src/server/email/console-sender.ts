import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmailMessage, EmailSender } from "./types";

/**
 * Development sender. Prints a short notice and writes the full message to
 * .mail-outbox/ so you (and the Playwright tests) can open links from it.
 * Never use in production: messages are stored in plain text on disk.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly dir = process.env.MAIL_OUTBOX_DIR ?? path.join(process.cwd(), ".mail-outbox")) {}

  async send(message: EmailMessage): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const safeTo = message.to.replace(/[^a-z0-9@._-]/gi, "_");
    const file = path.join(this.dir, `${Date.now()}-${message.tag}-${safeTo}.json`);
    // Write then rename, so anything watching the folder never reads a half-written file.
    await writeFile(`${file}.tmp`, JSON.stringify({ ...message, sentAt: new Date().toISOString() }, null, 2));
    await rename(`${file}.tmp`, file);
    console.info(`[email:dev] "${message.subject}" → ${message.to} (saved to ${path.relative(process.cwd(), file)})`);
  }
}
