import type { EmailMessage, EmailSender } from "./types";

/**
 * Production sender using Resend's HTTP API.
 * UNTESTED until RESEND_API_KEY and a verified sending domain are configured.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        tags: [{ name: "type", value: message.tag }],
      }),
    });
    if (!res.ok) {
      // Don't log the recipient or body: they are personal data.
      throw new Error(`Email provider rejected message (${res.status})`);
    }
  }
}
