import "server-only";
import { env } from "@/config/env";
import { ConsoleEmailSender } from "./console-sender";
import { ResendEmailSender } from "./resend-sender";
import type { EmailMessage, EmailSender } from "./types";

let sender: EmailSender | undefined;

function getSender(): EmailSender {
  if (sender) return sender;
  if (env.emailProvider === "resend") {
    if (!env.resendApiKey) throw new Error("EMAIL_PROVIDER=resend but RESEND_API_KEY is not set");
    sender = new ResendEmailSender(env.resendApiKey, env.emailFrom);
  } else {
    if (env.isProduction && process.env.ALLOW_CONSOLE_EMAIL_IN_PRODUCTION !== "true") {
      throw new Error("The console email sender must not be used in production");
    }
    sender = new ConsoleEmailSender();
  }
  return sender;
}

export async function sendEmail(message: EmailMessage) {
  await getSender().send(message);
}

export type { EmailMessage, EmailSender };
