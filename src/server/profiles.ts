import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { card, profile } from "@/db/schema";
import { safeExternalUrl } from "@/lib/urls";
import { type ProfileInput, slugFromName } from "@/lib/validation/profile";
import { UserFacingError } from "./errors";

/*
 * Every function here takes the acting user's id (from the verified session)
 * and only ever touches that user's rows. Pages and actions must go through
 * these functions rather than querying `profile` directly.
 */

export type OwnProfile = typeof profile.$inferSelect;

export async function getOwnProfile(userId: string, db: Db = defaultDb): Promise<OwnProfile | null> {
  return (await db.query.profile.findFirst({ where: eq(profile.userId, userId) })) ?? null;
}

async function slugTaken(slug: string, exceptUserId: string, db: Db) {
  const row = await db.query.profile.findFirst({
    where: and(eq(profile.slug, slug), ne(profile.userId, exceptUserId)),
    columns: { id: true },
  });
  return Boolean(row);
}

/** Finds a free slug based on `base`, adding -2, -3… as needed. */
export async function availableSlug(base: string, userId: string, db: Db = defaultDb): Promise<string> {
  const root = slugFromName(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root.slice(0, 36)}-${i + 1}`;
    if (!(await slugTaken(candidate, userId, db))) return candidate;
  }
  return `${root.slice(0, 30)}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Returns the user's profile, creating an unpublished draft from their name if they have none. */
export async function ensureOwnProfile(userId: string, name: string, db: Db = defaultDb): Promise<OwnProfile> {
  const existing = await getOwnProfile(userId, db);
  if (existing) return existing;
  const slug = await availableSlug(name, userId, db);
  const [created] = await db
    .insert(profile)
    .values({ userId, slug, displayName: name.slice(0, 80) || "Your name" })
    .onConflictDoNothing({ target: profile.userId })
    .returning();
  const result = created ?? (await getOwnProfile(userId, db));
  if (!result) throw new Error("Could not create profile");
  await attachUnlinkedCards(userId, result.id, db);
  return result;
}

/** Cards claimed before the profile existed point at it once it does. */
async function attachUnlinkedCards(userId: string, profileId: string, db: Db) {
  await db.update(card).set({ profileId }).where(and(eq(card.ownerId, userId), isNull(card.profileId)));
}

export async function saveOwnProfile(userId: string, name: string, input: ProfileInput, db: Db = defaultDb): Promise<OwnProfile> {
  const current = await ensureOwnProfile(userId, name, db);
  if (input.slug !== current.slug && (await slugTaken(input.slug, userId, db))) {
    throw new UserFacingError("That address is already taken. Try another.", "slug");
  }
  const [updated] = await db
    .update(profile)
    .set({
      slug: input.slug,
      displayName: input.displayName,
      jobTitle: input.jobTitle ?? null,
      company: input.company ?? null,
      bio: input.bio ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      showJobTitle: input.showJobTitle,
      showCompany: input.showCompany,
      showBio: input.showBio,
      showPhoto: input.showPhoto,
      showEmail: input.showEmail,
      showPhone: input.showPhone,
      showWebsite: input.showWebsite,
      showLinkedin: input.showLinkedin,
      allowIndexing: input.allowIndexing,
    })
    .where(eq(profile.userId, userId))
    .returning();
  return updated;
}

export async function setOwnProfilePublished(
  userId: string,
  published: boolean,
  emailVerified: boolean,
  db: Db = defaultDb,
): Promise<void> {
  if (published && !emailVerified) throw new UserFacingError("Confirm your email address before publishing your profile.");
  const result = await db.update(profile).set({ isPublished: published }).where(eq(profile.userId, userId)).returning({ id: profile.id });
  if (result.length === 0) throw new UserFacingError("Save your profile before publishing it.");
}

/** Sets the photo key and returns the previous one so the caller can delete the old file. */
export async function setOwnProfilePhoto(userId: string, photoKey: string | null, db: Db = defaultDb): Promise<string | null> {
  const current = await getOwnProfile(userId, db);
  if (!current) throw new UserFacingError("Save your profile before adding a photo.");
  await db.update(profile).set({ photoKey }).where(eq(profile.userId, userId));
  return current.photoKey;
}

// ---------------------------------------------------------------------------
// Public view
// ---------------------------------------------------------------------------

/** Exactly what a visitor may see. Hidden fields are never included, so they can't leak via the page, vCard or metadata. */
export type PublicProfile = {
  slug: string;
  displayName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  photoKey: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  allowIndexing: boolean;
};

export function toPublicProfile(p: OwnProfile): PublicProfile {
  return {
    slug: p.slug,
    displayName: p.displayName,
    jobTitle: p.showJobTitle ? p.jobTitle : null,
    company: p.showCompany ? p.company : null,
    bio: p.showBio ? p.bio : null,
    photoKey: p.showPhoto ? p.photoKey : null,
    email: p.showEmail ? p.email : null,
    phone: p.showPhone ? p.phone : null,
    website: p.showWebsite ? safeExternalUrl(p.website) : null,
    linkedinUrl: p.showLinkedin ? safeExternalUrl(p.linkedinUrl) : null,
    allowIndexing: p.allowIndexing,
  };
}

/** Published profiles only. Returns null for unknown and unpublished slugs alike. */
export async function getPublicProfileBySlug(slug: string, db: Db = defaultDb): Promise<PublicProfile | null> {
  return (await getPublicProfileEntry(slug, db))?.profile ?? null;
}

/**
 * The public view plus the internal id, for server-side use only (counting
 * views). Keep the id out of anything rendered or sent to the browser.
 */
export async function getPublicProfileEntry(slug: string, db: Db = defaultDb): Promise<{ id: string; profile: PublicProfile } | null> {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return null;
  const row = await db.query.profile.findFirst({ where: and(eq(profile.slug, slug), eq(profile.isPublished, true)) });
  return row ? { id: row.id, profile: toPublicProfile(row) } : null;
}

/** Cheap existence check used by the proxy to return a real 404 before the page streams. */
export async function publicProfileExists(slug: string, db: Db = defaultDb): Promise<boolean> {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return false;
  const row = await db.query.profile.findFirst({
    where: and(eq(profile.slug, slug), eq(profile.isPublished, true)),
    columns: { id: true },
  });
  return Boolean(row);
}

/**
 * Photo access: anyone may load a photo that is shown on a published profile;
 * otherwise only its owner (for the editor and preview).
 */
export async function canViewPhoto(photoKey: string, viewerUserId: string | null, db: Db = defaultDb): Promise<"public" | "owner" | false> {
  const row = await db.query.profile.findFirst({
    where: eq(profile.photoKey, photoKey),
    columns: { userId: true, isPublished: true, showPhoto: true },
  });
  if (!row) return false;
  if (row.isPublished && row.showPhoto) return "public";
  if (viewerUserId && row.userId === viewerUserId) return "owner";
  return false;
}
