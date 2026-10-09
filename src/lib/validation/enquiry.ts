import { z } from "zod";

export const TIMELINES = ["Within 2 weeks", "Within a month", "In 1–3 months", "Just exploring"] as const;

const optional = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const enquirySchema = z.object({
  company: z.string().trim().min(1, "Enter your company name.").max(120),
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a work email address, like name@company.com.")),
  phone: optional(30, "Phone"),
  quantity: z.coerce
    .number({ error: "Enter roughly how many cards you need." })
    .int("Enter a whole number.")
    .min(1, "Enter roughly how many cards you need.")
    .max(100_000, "For more than 100,000 cards, tell us in the message."),
  timeline: z.enum(TIMELINES, { error: "Choose a timeline." }),
  message: z.string().trim().min(10, "Tell us a little about what you need (at least 10 characters).").max(2000),
  /** Honeypot: humans leave it empty. */
  website: z.string().max(0).optional(),
});
