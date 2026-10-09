import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { card, cardAssignment } from "@/db/schema";
import { profileInputSchema } from "@/lib/validation/profile";
import {
  claimCard,
  deactivateOwnCard,
  getOwnCard,
  listOwnCards,
  reactivateOwnCard,
  renameOwnCard,
  resolveCardToken,
  setOwnCardDestination,
} from "@/server/cards";
import { NotFoundError, UserFacingError } from "@/server/errors";
import {
  ensureOwnProfile,
  getOwnProfile,
  getPublicProfileBySlug,
  saveOwnProfile,
  setOwnProfilePublished,
} from "@/server/profiles";
import { SECRET, makeUnclaimedCard, makeUser } from "./fixtures";

const input = (overrides: Record<string, string> = {}) =>
  profileInputSchema.parse({
    slug: overrides.slug ?? `p-${crypto.randomUUID().slice(0, 8)}`,
    displayName: "Alice Example",
    jobTitle: "CFO",
    email: "alice@example.com",
    phone: "+44 20 7946 0000",
    linkedinUrl: "https://www.linkedin.com/in/alice-example",
    showJobTitle: "on",
    showLinkedin: "on",
    ...overrides,
  });

describe("ownership of profiles and cards", () => {
  let alice: { id: string; name: string };
  let mallory: { id: string; name: string };
  let aliceCardId: string;

  beforeAll(async () => {
    alice = await makeUser("Alice Example");
    mallory = await makeUser("Mallory Example");
    const c = await makeUnclaimedCard();
    aliceCardId = (await claimCard(alice, c.token, c.code, SECRET)).cardId;
  });

  it("a user only sees their own cards", async () => {
    expect((await listOwnCards(alice.id)).map((c) => c.id)).toContain(aliceCardId);
    expect((await listOwnCards(mallory.id)).map((c) => c.id)).not.toContain(aliceCardId);
  });

  it("another user cannot read, rename, redirect, deactivate or reactivate someone else's card", async () => {
    await expect(getOwnCard(mallory.id, aliceCardId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(renameOwnCard(mallory.id, aliceCardId, "pwned")).rejects.toBeInstanceOf(NotFoundError);
    await expect(setOwnCardDestination(mallory.id, aliceCardId, "PROFILE")).rejects.toBeInstanceOf(NotFoundError);
    await expect(deactivateOwnCard(mallory.id, aliceCardId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(reactivateOwnCard(mallory.id, aliceCardId)).rejects.toBeInstanceOf(NotFoundError);
    const row = await db.query.card.findFirst({ where: eq(card.id, aliceCardId) });
    expect(row?.label).toBeNull();
    expect(row?.status).toBe("ACTIVE");
    expect(row?.ownerId).toBe(alice.id);
  });

  it("another user cannot claim an already-claimed card, even with its code", async () => {
    const c = await makeUnclaimedCard();
    await claimCard(alice, c.token, c.code, SECRET);
    await expect(claimCard(mallory, c.token, c.code, SECRET)).rejects.toThrow(UserFacingError);
    const row = await db.query.card.findFirst({ where: eq(card.token, c.token) });
    expect(row?.ownerId).toBe(alice.id);
  });

  it("profile edits only ever change the acting user's profile", async () => {
    await saveOwnProfile(alice.id, alice.name, input({ slug: "alice-own" }));
    await saveOwnProfile(mallory.id, mallory.name, input({ slug: "mallory-own", displayName: "Mallory" }));
    expect((await getOwnProfile(alice.id))?.displayName).toBe("Alice Example");
    expect((await getOwnProfile(mallory.id))?.displayName).toBe("Mallory");
  });

  it("a user cannot take another user's profile address", async () => {
    await expect(saveOwnProfile(mallory.id, mallory.name, input({ slug: "alice-own" }))).rejects.toMatchObject({
      field: "slug",
    });
    expect((await getOwnProfile(alice.id))?.slug).toBe("alice-own");
  });
});

describe("card claiming", () => {
  it("claims with the right code (any case or spacing) and records the assignment", async () => {
    const u = await makeUser("Claire Claimer");
    const c = await makeUnclaimedCard();
    const { cardId } = await claimCard(u, c.token, ` ${c.code.toLowerCase().replace("-", " ")} `, SECRET);
    const row = await db.query.card.findFirst({ where: eq(card.id, cardId) });
    expect(row).toMatchObject({ ownerId: u.id, status: "ACTIVE" });
    expect(row?.profileId).toBeTruthy();
    const history = await db.query.cardAssignment.findMany({ where: eq(cardAssignment.cardId, cardId) });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ userId: u.id, method: "claim" });
  });

  it("rejects a wrong code, an unknown token and a malformed token with the same message", async () => {
    const u = await makeUser();
    const c = await makeUnclaimedCard();
    const messages = await Promise.all(
      [
        claimCard(u, c.token, "AAAAA-AAAAA", SECRET),
        claimCard(u, "A".repeat(22), c.code, SECRET),
        claimCard(u, "../etc", c.code, SECRET),
      ].map((p) => p.then(() => "resolved", (e: Error) => e.message)),
    );
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/doesn't match/);
    expect((await db.query.card.findFirst({ where: eq(card.token, c.token) }))?.status).toBe("UNCLAIMED");
  });

  it("only one of two simultaneous claims wins", async () => {
    const [a, b] = [await makeUser("A"), await makeUser("B")];
    const c = await makeUnclaimedCard();
    const results = await Promise.allSettled([claimCard(a, c.token, c.code, SECRET), claimCard(b, c.token, c.code, SECRET)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});

describe("card resolution", () => {
  it("resolves every state correctly", async () => {
    const owner = await makeUser("Rex Resolver");
    const c = await makeUnclaimedCard();
    expect(await resolveCardToken(c.token)).toEqual({ kind: "unclaimed" });

    const { cardId } = await claimCard(owner, c.token, c.code, SECRET);
    // Claimed, profile not yet published.
    expect(await resolveCardToken(c.token)).toEqual({ kind: "not-ready" });

    const slug = `rex-${crypto.randomUUID().slice(0, 6)}`;
    await saveOwnProfile(owner.id, owner.name, input({ slug }));
    await setOwnProfilePublished(owner.id, true, true);
    expect(await resolveCardToken(c.token)).toMatchObject({ kind: "redirect", location: `/p/${slug}` });

    await setOwnCardDestination(owner.id, cardId, "LINKEDIN");
    expect(await resolveCardToken(c.token)).toMatchObject({
      kind: "redirect",
      location: "https://www.linkedin.com/in/alice-example",
    });

    await deactivateOwnCard(owner.id, cardId);
    expect(await resolveCardToken(c.token)).toEqual({ kind: "inactive" });

    await reactivateOwnCard(owner.id, cardId);
    expect((await resolveCardToken(c.token)).kind).toBe("redirect");
  });

  it("unknown and malformed tokens look exactly like deactivated ones", async () => {
    expect(await resolveCardToken("B".repeat(22))).toEqual({ kind: "inactive" });
    expect(await resolveCardToken("not a token")).toEqual({ kind: "inactive" });
  });

  it("won't send a card to LinkedIn without a LinkedIn address", async () => {
    const u = await makeUser("No Linkedin");
    const c = await makeUnclaimedCard();
    const { cardId } = await claimCard(u, c.token, c.code, SECRET);
    await expect(setOwnCardDestination(u.id, cardId, "LINKEDIN")).rejects.toThrow(/Add your LinkedIn address/);
  });
});

describe("public profile view", () => {
  it("never exposes hidden fields or unpublished profiles", async () => {
    const u = await makeUser("Hidden Fields");
    const slug = `hidden-${crypto.randomUUID().slice(0, 6)}`;
    await saveOwnProfile(u.id, u.name, input({ slug, showEmail: "", showPhone: "" }));
    expect(await getPublicProfileBySlug(slug)).toBeNull(); // not published yet

    await setOwnProfilePublished(u.id, true, true);
    const pub = await getPublicProfileBySlug(slug);
    expect(pub).not.toBeNull();
    expect(pub?.email).toBeNull();
    expect(pub?.phone).toBeNull();
    expect(pub?.jobTitle).toBe("CFO");
    expect(pub?.linkedinUrl).toBe("https://www.linkedin.com/in/alice-example");
    expect(Object.keys(pub!)).not.toContain("userId");
    expect(Object.keys(pub!)).not.toContain("id");
  });

  it("requires a verified email to publish", async () => {
    const u = await makeUser("Unverified");
    await ensureOwnProfile(u.id, u.name);
    await expect(setOwnProfilePublished(u.id, true, false)).rejects.toThrow(/Confirm your email/);
  });
});

describe("analytics", () => {
  it("only counts when enabled, stores daily totals without identifiers, and skips bots", async () => {
    const { recordTap, recordView, tapTotals, viewTotal } = await import("@/server/analytics");
    const u = await makeUser("Counted");
    const c = await makeUnclaimedCard();
    const { cardId } = await claimCard(u, c.token, c.code, SECRET);
    const p = await getOwnProfile(u.id);

    delete process.env.ANALYTICS_ENABLED;
    await recordTap(cardId, "Mozilla/5.0 (iPhone)");
    expect(await tapTotals([cardId])).toEqual({});

    process.env.ANALYTICS_ENABLED = "true";
    await recordTap(cardId, "Mozilla/5.0 (iPhone)");
    await recordTap(cardId, "Mozilla/5.0 (Android)");
    await recordTap(cardId, "Googlebot/2.1");
    await recordView(p!.id, "Mozilla/5.0");
    expect(await tapTotals([cardId])).toEqual({ [cardId]: 2 });
    expect(await viewTotal(p!.id)).toBe(1);

    const { dailyStat } = await import("@/db/schema");
    const rows = await db.select().from(dailyStat).where(eq(dailyStat.cardId, cardId));
    expect(rows).toHaveLength(1); // one row per card per day
    expect(Object.keys(rows[0]).sort()).toEqual(["cardId", "count", "day", "id", "kind", "profileId"]);
    delete process.env.ANALYTICS_ENABLED;
  });
});
