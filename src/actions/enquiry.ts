"use server";

import { headers } from "next/headers";
import { brand } from "@/config/brand";
import { db } from "@/db";
import { enquiry } from "@/db/schema";
import { contactSchema } from "@/lib/validation/contact";
import { enquirySchema } from "@/lib/validation/enquiry";
import { sendEmail } from "@/server/email";
import { enquiryNotificationMessage } from "@/server/email/templates";
import { checkLimit, clientKey } from "@/server/rate-limit";
import { type ActionState, toActionError } from "./result";
import { logError } from "@/server/log";

export async function submitEnquiryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    if (!(await checkLimit("formPerClient", clientKey(await headers()))).ok) {
      return { ok: false, message: "You've sent several enquiries already. Wait a few minutes, or email us directly." };
    }
    const raw = Object.fromEntries(formData);
    // Bots that fill the hidden field get a normal-looking success and nothing is stored.
    if (typeof raw.website === "string" && raw.website.length > 0) return { ok: true, message: "Thanks. We'll be in touch within one working day." };
    const input = enquirySchema.parse(raw);
    await db.insert(enquiry).values({
      kind: "team",
      company: input.company,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      quantity: input.quantity,
      timeline: input.timeline,
      message: input.message,
    });
    const notify = process.env.ENQUIRY_NOTIFY_EMAIL ?? brand.supportEmail;
    void sendEmail(enquiryNotificationMessage(notify, input)).catch((e: unknown) =>
      logError("enquiry.notification_email", e),
    );
    return { ok: true, message: "Thanks. We'll be in touch within one working day." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    if (!(await checkLimit("formPerClient", clientKey(await headers()))).ok) {
      return { ok: false, message: "You've sent several messages already. Wait a few minutes, or email us directly." };
    }
    const raw = Object.fromEntries(formData);
    if (typeof raw.website === "string" && raw.website.length > 0) return { ok: true, message: "Thanks. We'll reply within one working day." };
    const input = contactSchema.parse(raw);
    const message = input.orderReference ? `Order: ${input.orderReference}\n\n${input.message}` : input.message;
    await db.insert(enquiry).values({ kind: "contact", name: input.name, email: input.email, message });
    const notify = process.env.ENQUIRY_NOTIFY_EMAIL ?? brand.supportEmail;
    void sendEmail(enquiryNotificationMessage(notify, { name: input.name, email: input.email, message })).catch((e: unknown) =>
      logError("contact.notification_email", e),
    );
    return { ok: true, message: "Thanks. We'll reply within one working day." };
  } catch (error) {
    return toActionError(error);
  }
}
