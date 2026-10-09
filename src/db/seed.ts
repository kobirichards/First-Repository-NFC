/**
 * Demo data for local development: a demo admin, a demo customer with a
 * published profile, cards in every state, and the placeholder catalogue.
 * Refuses to run when APP_ENV=production. Safe to re-run (it upserts).
 */
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { generateCardToken, generateClaimCode, hashClaimCode } from "../server/cards/tokens";
import * as schema from "./schema";

const appEnv = process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
if (appEnv === "production") {
  console.error("Refusing to seed demo data into a production environment.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, casing: "snake_case" });
const claimSecret = process.env.CLAIM_CODE_SECRET;
if (!claimSecret) throw new Error("CLAIM_CODE_SECRET must be set");
const cardDomain = (process.env.CARD_DOMAIN ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const DEMO_PASSWORD = "demo-password-123";

async function upsertUser(email: string, name: string, role: "user" | "admin") {
  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.insert(schema.user).values({ id, email, name, role, emailVerified: true });
  await db.insert(schema.account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(DEMO_PASSWORD),
  });
  return id;
}

type Catalogue = Array<{
  slug: string;
  name: string;
  description: string;
  customisable: boolean;
  prices: Record<"GBP" | "EUR" | "USD", number>;
  options: Array<{ slug: string; name: string; description: string }>;
}>;

/** PLACEHOLDER prices: set real ones in the admin area before launch. */
const catalogue: Catalogue = [
  {
    slug: "classic",
    name: "Classic card",
    description: "A sturdy PVC card with an NFC chip and a printed QR code. Light enough for a wallet or badge holder.",
    customisable: true,
    prices: { GBP: 2400, EUR: 2800, USD: 2900 },
    options: [
      { slug: "matte-black", name: "Matte black", description: "Soft-touch black with a white print." },
      { slug: "bottle-green", name: "Bottle green", description: "Deep green with a brass-coloured print." },
      { slug: "recycled-white", name: "Recycled white", description: "Made from recycled PVC, printed in black." },
    ],
  },
  {
    slug: "metal",
    name: "Metal card",
    description: "Stainless steel with a laser-engraved finish. The chip sits in a protected window so it still reads reliably.",
    customisable: true,
    prices: { GBP: 5900, EUR: 6900, USD: 6900 },
    options: [
      { slug: "brushed-steel", name: "Brushed steel", description: "Natural brushed finish." },
      { slug: "black-steel", name: "Black steel", description: "Black coating with engraved detail." },
    ],
  },
];

async function seedCatalogue() {
  for (const [i, item] of catalogue.entries()) {
    let product = await db.query.product.findFirst({ where: eq(schema.product.slug, item.slug) });
    if (!product) {
      [product] = await db
        .insert(schema.product)
        .values({ slug: item.slug, name: item.name, description: item.description, customisable: item.customisable, sortOrder: i })
        .returning();
      for (const [currency, amount] of Object.entries(item.prices)) {
        await db.insert(schema.price).values({ productId: product.id, currency: currency as "GBP", amount });
      }
      for (const [j, option] of item.options.entries()) {
        await db.insert(schema.productOption).values({ productId: product.id, sortOrder: j, ...option });
      }
    }
  }
}

async function seedCards(customerId: string, profileId: string) {
  const existing = await db.query.card.findFirst({ where: eq(schema.card.ownerId, customerId) });
  if (existing) return [];
  const [batch] = await db.insert(schema.cardBatch).values({ label: "Demo batch", quantity: 5 }).returning();
  const plan = [
    { status: "ACTIVE", destination: "PROFILE", label: "Conference card", owned: true },
    { status: "ACTIVE", destination: "LINKEDIN", label: "Straight to LinkedIn", owned: true },
    { status: "DEACTIVATED", destination: "PROFILE", label: "Lost in Lisbon", owned: true },
    { status: "UNCLAIMED", destination: "PROFILE", label: null, owned: false },
    { status: "UNCLAIMED", destination: "PROFILE", label: null, owned: false },
  ] as const;
  const printed: Array<{ state: string; url: string; claimCode: string }> = [];
  for (const item of plan) {
    const token = generateCardToken();
    const claimCode = generateClaimCode();
    const now = new Date();
    const [created] = await db
      .insert(schema.card)
      .values({
        token,
        claimCodeHash: hashClaimCode(claimCode, claimSecret!),
        status: item.status,
        destination: item.destination,
        label: item.label,
        batchId: batch.id,
        ownerId: item.owned ? customerId : null,
        profileId: item.owned ? profileId : null,
        claimedAt: item.owned ? now : null,
        deactivatedAt: item.status === "DEACTIVATED" ? now : null,
      })
      .returning();
    if (item.owned) {
      await db.insert(schema.cardAssignment).values({ cardId: created.id, userId: customerId, profileId, method: "claim" });
    }
    printed.push({ state: `${item.status}${item.owned ? ` → ${item.destination}` : ""}`, url: `${cardDomain}/c/${token}`, claimCode });
  }
  return printed;
}

async function main() {
  await seedCatalogue();
  await upsertUser("admin@example.com", "Demo Admin", "admin");
  const customerId = await upsertUser("demo@example.com", "Jordan Patel", "user");

  let profile = await db.query.profile.findFirst({ where: eq(schema.profile.userId, customerId) });
  if (!profile) {
    [profile] = await db
      .insert(schema.profile)
      .values({
        userId: customerId,
        slug: "jordan-patel",
        displayName: "Jordan Patel",
        jobTitle: "Head of Partnerships",
        company: "Northwind Analytics (demo)",
        bio: "I help data teams find the right partners. Demo profile: not a real person.",
        email: "demo@example.com",
        website: "https://example.com",
        linkedinUrl: "https://www.linkedin.com/in/example-demo-profile",
        showEmail: true,
        isPublished: true,
      })
      .returning();
  }

  const cards = await seedCards(customerId, profile.id);

  console.info("\nSeed complete.\n");
  console.info(`  Demo customer  demo@example.com   / ${DEMO_PASSWORD}`);
  console.info(`  Demo admin     admin@example.com  / ${DEMO_PASSWORD}  (MFA setup will be required from Milestone 4)`);
  if (cards.length) {
    console.info("\n  Cards (claim codes are only shown now):");
    for (const c of cards) console.info(`    ${c.state.padEnd(22)} ${c.url}   claim code ${c.claimCode}`);
  }
  console.info("");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
