"use server";

import { headers } from "next/headers";
import { brand } from "@/config/brand";
import { db } from "@/db";
import { enquiry } from "@/db/schema";
import { enquirySchema } from "@/lib/validation/enquiry";
import { sendEmail } from "@/server/email";
import { enquiryNotificationMessage } from "@/server/email/templates";
import { checkLimit, clientKey } from "@/server/rate-limit";
import { type ActionState, toActionError } from "./result";

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
      console.error("[enquiry] notification failed:", e instanceof Error ? e.message : e),
    );
    return { ok: true, message: "Thanks. We'll be in touch within one working day." };
  } catch (error) {
    return toActionError(error);
  }
}
