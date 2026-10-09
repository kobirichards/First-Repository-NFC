import { z } from "zod";
import { normaliseLinkedInUrl, safeExternalUrl, withScheme } from "@/lib/urls";

export const RESERVED_SLUGS = new Set(["new", "edit", "preview", "admin", "api", "settings", "me", "vcard", "qr"]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters.")
  .max(40, "Use no more than 40 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens, like jane-smith.")
  .refine((s) => !RESERVED_SLUGS.has(s), "That address is reserved. Choose another.");

/** Empty strings become undefined so optional fields can be cleared. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be at most ${max} characters.`)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

export const profileInputSchema = z.object({
  slug: slugSchema,
  displayName: z.string().trim().min(1, "Enter your name.").max(80, "Your name can be at most 80 characters."),
  jobTitle: optionalText(100, "Job title"),
  company: optionalText(100, "Company"),
  bio: optionalText(500, "Bio"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.email("Enter a valid email address, like name@company.com.").optional())
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone numbers can be at most 30 characters.")
    .transform((v) => (v === "" ? undefined : v))
    .refine(
      (v) => v === undefined || (/^[+()\d\s.-]+$/.test(v) && v.replace(/\D/g, "").length >= 6),
      "Enter a phone number using digits, spaces and +, like +44 20 7946 0000.",
    )
    .optional(),
  website: z
    .string()
    .trim()
    .max(200, "Website addresses can be at most 200 characters.")
    .transform((v, ctx) => {
      if (v === "") return undefined;
      const url = safeExternalUrl(withScheme(v));
      if (!url || !new URL(url).hostname.includes(".")) {
        ctx.addIssue({ code: "custom", message: "Enter a web address, like https://company.com." });
        return z.NEVER;
      }
      return url;
    })
    .optional(),
  linkedinUrl: z
    .string()
    .trim()
    .max(200, "LinkedIn addresses can be at most 200 characters.")
    .transform((v, ctx) => {
      if (v === "") return undefined;
      if (/^http:\/\//i.test(v)) {
        ctx.addIssue({ code: "custom", message: "Use the https:// address of your LinkedIn profile." });
        return z.NEVER;
      }
      const url = normaliseLinkedInUrl(v);
      if (!url) {
        ctx.addIssue({ code: "custom", message: "Enter your LinkedIn profile address, like https://www.linkedin.com/in/your-name." });
        return z.NEVER;
      }
      return url;
    })
    .optional(),
  showJobTitle: checkbox,
  showCompany: checkbox,
  showBio: checkbox,
  showPhoto: checkbox,
  showEmail: checkbox,
  showPhone: checkbox,
  showWebsite: checkbox,
  showLinkedin: checkbox,
  allowIndexing: checkbox,
});

export type ProfileInput = z.output<typeof profileInputSchema>;

/** Suggest a slug from a name: "Zoë O'Brien" → "zoe-obrien". */
export function slugFromName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `${base || "card"}-profile`;
}
