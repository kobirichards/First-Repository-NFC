/**
 * Tessera data model (Drizzle, PostgreSQL). See PLAN.md for the reasoning.
 * Money is always integer minor units (pence / cents).
 * Columns are snake_case in the database (drizzle `casing: "snake_case"`).
 */
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Auth (Better Auth tables, incl. admin + two-factor plugin fields)
// ---------------------------------------------------------------------------

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    // admin plugin
    role: text().default("user"),
    banned: boolean().default(false),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true }),
    // two-factor plugin
    twoFactorEnabled: boolean().default(false),
  },
  // Admin customer list is sorted newest first.
  (t) => [index().on(t.createdAt)],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)],
);

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text().primaryKey(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean().default(true),
    failedVerificationCount: integer().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.secret), index().on(t.userId)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Profiles and cards
// ---------------------------------------------------------------------------

export const profile = pgTable(
  "profile",
  {
    id: id(),
    userId: text()
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Public URL /p/{slug}. Owner can change it; card URLs never depend on it. */
    slug: text().notNull().unique(),
    displayName: text().notNull(),
    jobTitle: text(),
    company: text(),
    bio: text(),
    photoKey: text(),
    email: text(),
    phone: text(),
    website: text(),
    linkedinUrl: text(),
    // Visibility toggles. The name is always public once published.
    showJobTitle: boolean().notNull().default(true),
    showCompany: boolean().notNull().default(true),
    showBio: boolean().notNull().default(true),
    showPhoto: boolean().notNull().default(true),
    showEmail: boolean().notNull().default(false),
    showPhone: boolean().notNull().default(false),
    showWebsite: boolean().notNull().default(true),
    showLinkedin: boolean().notNull().default(true),
    isPublished: boolean().notNull().default(false),
    /** Public profiles are noindex unless the owner opts in. */
    allowIndexing: boolean().notNull().default(false),
    /** Reserved for future team/organisation accounts (no relation yet). */
    organisationId: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.organisationId)],
);

export const cardStatus = pgEnum("card_status", ["UNCLAIMED", "ACTIVE", "DEACTIVATED"]);
export const cardDestination = pgEnum("card_destination", ["PROFILE", "LINKEDIN"]);

export const cardBatch = pgTable(
  "card_batch",
  {
    id: id(),
    label: text().notNull(),
    quantity: integer().notNull(),
    createdById: text().references(() => user.id, { onDelete: "set null" }),
    /** Set once the one-time CSV (which contains plain claim codes) has been downloaded. */
    exportedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);

export const card = pgTable(
  "card",
  {
    id: id(),
    /** 128-bit random base64url token. Written to the chip. NEVER changes. */
    token: text().notNull().unique(),
    /** HMAC-SHA256 of the printed claim code. The plain code is never stored. */
    claimCodeHash: text().notNull(),
    status: cardStatus().notNull().default("UNCLAIMED"),
    destination: cardDestination().notNull().default("PROFILE"),
    /** Owner's own label, e.g. "Conference card". */
    label: text(),
    ownerId: text().references(() => user.id, { onDelete: "set null" }),
    profileId: text().references(() => profile.id, { onDelete: "set null" }),
    batchId: text().references(() => cardBatch.id, { onDelete: "set null" }),
    orderItemId: text().references(() => orderItem.id, { onDelete: "set null" }),
    /** Reserved for future team/organisation accounts (no relation yet). */
    organisationId: text(),
    claimedAt: timestamp({ withTimezone: true }),
    deactivatedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.ownerId),
    index().on(t.profileId),
    index().on(t.batchId),
    index().on(t.organisationId),
    index().on(t.orderItemId),
    // Admin card list (newest first) and "next unclaimed card from stock" (oldest first).
    index().on(t.status, t.createdAt),
    index().on(t.createdAt),
  ],
);

/** History of card assignments. The current assignment is mirrored on `card`. */
export const cardAssignment = pgTable(
  "card_assignment",
  {
    id: id(),
    cardId: text()
      .notNull()
      .references(() => card.id, { onDelete: "cascade" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    profileId: text().references(() => profile.id, { onDelete: "set null" }),
    /** "claim" | "order" | "admin" */
    method: text().notNull(),
    assignedById: text().references(() => user.id, { onDelete: "set null" }),
    assignedAt: createdAt(),
    endedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.cardId), index().on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const currency = pgEnum("currency", ["GBP", "EUR", "USD"]);

export const product = pgTable("product", {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull(),
  /** Supports printed name/title/logo. */
  customisable: boolean().notNull().default(false),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A finish/material variant, e.g. "Matte black" or "Brushed steel". */
export const productOption = pgTable(
  "product_option",
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    slug: text().notNull(),
    name: text().notNull(),
    description: text(),
    /** Null means not tracked. */
    inventory: integer(),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [uniqueIndex().on(t.productId, t.slug)],
);

/** Unit price in minor units. An option price, if present, replaces the product price. */
export const price = pgTable(
  "price",
  {
    id: id(),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    optionId: text().references(() => productOption.id, { onDelete: "cascade" }),
    currency: currency().notNull(),
    amount: integer().notNull(),
  },
  (t) => [unique().on(t.productId, t.optionId, t.currency).nullsNotDistinct()],
);

// ---------------------------------------------------------------------------
// Cart and orders
// ---------------------------------------------------------------------------

export const cart = pgTable(
  "cart",
  {
    id: id(),
    /** Null for anonymous carts (identified by an httpOnly cookie holding this id). */
    userId: text().references(() => user.id, { onDelete: "cascade" }),
    currency: currency().notNull().default("GBP"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  // Abandoned guest baskets are cleaned up by age.
  (t) => [index().on(t.userId), index().on(t.updatedAt)],
);

export type Customisation = { printName?: string; printTitle?: string; artworkKey?: string };

export const cartItem = pgTable(
  "cart_item",
  {
    id: id(),
    cartId: text()
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    productId: text()
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    optionId: text().references(() => productOption.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    customisation: jsonb().$type<Customisation>(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.cartId), index().on(t.productId)],
);

export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "AWAITING_PROOF",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const order = pgTable(
  "order",
  {
    id: id(),
    /** Human-friendly reference, e.g. TS-7K3M9Q. */
    reference: text().notNull().unique(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    email: text().notNull(),
    currency: currency().notNull(),
    subtotal: integer().notNull(),
    shipping: integer().notNull().default(0),
    tax: integer().notNull().default(0),
    total: integer().notNull(),
    status: orderStatus().notNull().default("PENDING_PAYMENT"),
    stripeCheckoutSessionId: text().unique(),
    stripePaymentIntentId: text(),
    shippingName: text(),
    shippingAddress: jsonb(),
    trackingNumber: text(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId, t.createdAt), index().on(t.status, t.createdAt), index().on(t.createdAt)],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: id(),
    orderId: text()
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: text().references(() => product.id, { onDelete: "set null" }),
    optionId: text().references(() => productOption.id, { onDelete: "set null" }),
    /** Snapshots at purchase time. */
    productName: text().notNull(),
    optionName: text(),
    quantity: integer().notNull(),
    unitAmount: integer().notNull(),
    customisation: jsonb().$type<Customisation>(),
  },
  (t) => [index().on(t.orderId)],
);

export const refund = pgTable(
  "refund",
  {
    id: id(),
    orderId: text()
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    amount: integer().notNull(),
    reason: text(),
    /** Refunds are issued in Stripe; this only records them. */
    stripeRefundId: text(),
    recordedById: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.orderId)],
);

export const proofStatus = pgEnum("proof_status", ["PENDING", "APPROVED", "REJECTED"]);

export const artworkProof = pgTable(
  "artwork_proof",
  {
    id: id(),
    orderItemId: text()
      .notNull()
      .references(() => orderItem.id, { onDelete: "cascade" }),
    /** Uploaded logo, if any. Text-only customisations (name/title) have none but still need approval. */
    fileKey: text(),
    status: proofStatus().notNull().default("PENDING"),
    reviewNotes: text(),
    reviewedById: text().references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.orderItemId), index().on(t.status, t.createdAt)],
);

export type CheckoutSnapshotLine = {
  productId: string;
  optionId: string | null;
  productName: string;
  optionName: string | null;
  quantity: number;
  unitAmount: number;
  customisation: Customisation | null;
};

/**
 * What the customer agreed to buy when they started checkout. The order is
 * created from this snapshot (plus the amounts Stripe reports) when the
 * verified webhook arrives, never from the browser redirect.
 */
export const checkoutSession = pgTable(
  "checkout_session",
  {
    /** The payment provider's session id (Stripe `cs_…`, or `sim_…` in development). */
    id: text().primaryKey(),
    provider: text().notNull(),
    cartId: text().references(() => cart.id, { onDelete: "set null" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    currency: currency().notNull(),
    lines: jsonb().$type<CheckoutSnapshotLine[]>().notNull(),
    subtotal: integer().notNull(),
    /** "open" | "awaiting_payment" | "completed" | "expired" */
    status: text().notNull().default("open"),
    orderId: text().references(() => order.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId), index().on(t.status, t.createdAt)],
);

/** Processed Stripe webhook event IDs, for idempotency. */
export const stripeEvent = pgTable("stripe_event", {
  id: text().primaryKey(),
  type: text().notNull(),
  processedAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Enquiries, audit, analytics
// ---------------------------------------------------------------------------

export const enquiryStatus = pgEnum("enquiry_status", ["NEW", "IN_PROGRESS", "CLOSED"]);

export const enquiry = pgTable(
  "enquiry",
  {
    id: id(),
    /** "team" (bulk/corporate) or "contact" */
    kind: text().notNull().default("team"),
    company: text(),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    quantity: integer(),
    timeline: text(),
    message: text().notNull(),
    status: enquiryStatus().notNull().default("NEW"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.createdAt)],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: id(),
    actorId: text().references(() => user.id, { onDelete: "set null" }),
    /** e.g. "card.reassign", "order.status", "product.update" */
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.entityType, t.entityId, t.createdAt), index().on(t.createdAt), index().on(t.actorId)],
);

/** Aggregate counts only. No IPs, user agents or visitor identifiers. */
export const dailyStat = pgTable(
  "daily_stat",
  {
    id: id(),
    day: date({ mode: "string" }).notNull(),
    /** "tap" (card URL hit) or "view" (profile page view) */
    kind: text().notNull(),
    cardId: text().references(() => card.id, { onDelete: "cascade" }),
    profileId: text().references(() => profile.id, { onDelete: "cascade" }),
    count: integer().notNull().default(0),
  },
  (t) => [
    unique().on(t.day, t.kind, t.cardId, t.profileId).nullsNotDistinct(),
    // Per-card and per-profile totals for the dashboard.
    index().on(t.cardId, t.day),
    index().on(t.profileId, t.day),
  ],
);

// ---------------------------------------------------------------------------
// Relations (for the relational query API)
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profile, { fields: [user.id], references: [profile.userId] }),
  cards: many(card),
  orders: many(order),
  auditEvents: many(auditEvent),
}));

export const profileRelations = relations(profile, ({ one, many }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
  cards: many(card),
}));

export const cardRelations = relations(card, ({ one, many }) => ({
  owner: one(user, { fields: [card.ownerId], references: [user.id] }),
  profile: one(profile, { fields: [card.profileId], references: [profile.id] }),
  batch: one(cardBatch, { fields: [card.batchId], references: [cardBatch.id] }),
  orderItem: one(orderItem, { fields: [card.orderItemId], references: [orderItem.id] }),
  assignments: many(cardAssignment),
}));

export const cardAssignmentRelations = relations(cardAssignment, ({ one }) => ({
  card: one(card, { fields: [cardAssignment.cardId], references: [card.id] }),
}));

export const cardBatchRelations = relations(cardBatch, ({ one, many }) => ({
  cards: many(card),
  createdBy: one(user, { fields: [cardBatch.createdById], references: [user.id] }),
}));

export const productRelations = relations(product, ({ many }) => ({
  options: many(productOption),
  prices: many(price),
}));

export const productOptionRelations = relations(productOption, ({ one, many }) => ({
  product: one(product, { fields: [productOption.productId], references: [product.id] }),
  prices: many(price),
}));

export const priceRelations = relations(price, ({ one }) => ({
  product: one(product, { fields: [price.productId], references: [product.id] }),
  option: one(productOption, { fields: [price.optionId], references: [productOption.id] }),
}));

export const cartRelations = relations(cart, ({ many }) => ({
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, { fields: [cartItem.cartId], references: [cart.id] }),
  product: one(product, { fields: [cartItem.productId], references: [product.id] }),
  option: one(productOption, { fields: [cartItem.optionId], references: [productOption.id] }),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
  items: many(orderItem),
  refunds: many(refund),
}));

export const orderItemRelations = relations(orderItem, ({ one, many }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  cards: many(card),
  proofs: many(artworkProof),
}));

export const refundRelations = relations(refund, ({ one }) => ({
  order: one(order, { fields: [refund.orderId], references: [order.id] }),
}));

export const auditEventRelations = relations(auditEvent, ({ one }) => ({
  actor: one(user, { fields: [auditEvent.actorId], references: [user.id] }),
}));

export const checkoutSessionRelations = relations(checkoutSession, ({ one }) => ({
  order: one(order, { fields: [checkoutSession.orderId], references: [order.id] }),
}));

export const artworkProofRelations = relations(artworkProof, ({ one }) => ({
  orderItem: one(orderItem, { fields: [artworkProof.orderItemId], references: [orderItem.id] }),
}));

