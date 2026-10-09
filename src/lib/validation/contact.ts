import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email address, like name@company.com.")),
  orderReference: z
    .string()
    .trim()
    .toUpperCase()
    .max(20)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(2000),
  website: z.string().max(0).optional(),
});
