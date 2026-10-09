import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "@/config/commerce";

export const quantitySchema = z.coerce
  .number({ error: "Enter a quantity." })
  .int("Enter a whole number.")
  .min(1, "The minimum is 1.")
  .max(MAX_QUANTITY_PER_LINE, `For more than ${MAX_QUANTITY_PER_LINE} cards, ask us for a team quote.`);

const optionalPrintText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .regex(/^[^<>{}\\]*$/, `${label} can't contain < > { } or \\.`)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const addToCartSchema = z.object({
  productId: z.string().min(1).max(64),
  optionId: z
    .string()
    .max(64)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  quantity: quantitySchema,
  printName: optionalPrintText(40, "Printed name"),
  printTitle: optionalPrintText(60, "Printed title"),
  artworkKey: z
    .string()
    .regex(/^artwork\/[0-9a-f-]{36}\.png$/, "Upload your logo again.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
