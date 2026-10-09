import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { dailyStat } from "@/db/schema";

/**
 * Optional, privacy-preserving usage counts (ANALYTICS_ENABLED=true).
 * Stores only a daily total per card or profile: no IP addresses, user
 * agents, cookies or any other visitor identifiers. The user agent is
 * looked at in memory only to skip obvious bots, and is never stored.
 */
export function analyticsEnabled() {
  return process.env.ANALYTICS_ENABLED === "true";
}

const BOT = /bot|crawler|spider|crawling|preview|facebookexternalhit|slackbot|whatsapp|linkedinbot|headless/i;

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function increment(kind: "tap" | "view", ids: { cardId?: string | null; profileId?: string | null }, db: Db) {
  await db
    .insert(dailyStat)
    .values({ day: today(), kind, cardId: ids.cardId ?? null, profileId: ids.profileId ?? null, count: 1 })
    .onConflictDoUpdate({
      target: [dailyStat.day, dailyStat.kind, dailyStat.cardId, dailyStat.profileId],
      set: { count: sql`${dailyStat.count} + 1` },
    });
}

export async function recordTap(cardId: string, userAgent: string | null, db: Db = defaultDb) {
  if (!analyticsEnabled() || (userAgent && BOT.test(userAgent))) return;
  await increment("tap", { cardId }, db).catch((e: unknown) => console.error("[analytics] tap:", e instanceof Error ? e.message : e));
}

export async function recordView(profileId: string, userAgent: string | null, db: Db = defaultDb) {
  if (!analyticsEnabled() || (userAgent && BOT.test(userAgent))) return;
  await increment("view", { profileId }, db).catch((e: unknown) => console.error("[analytics] view:", e instanceof Error ? e.message : e));
}

function since(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

/** Taps per card over the last `days` days. Callers pass only the user's own card ids. */
export async function tapTotals(cardIds: string[], days = 30, db: Db = defaultDb): Promise<Record<string, number>> {
  if (!cardIds.length) return {};
  const rows = await db
    .select({ cardId: dailyStat.cardId, total: sql<number>`sum(${dailyStat.count})::int` })
    .from(dailyStat)
    .where(and(eq(dailyStat.kind, "tap"), inArray(dailyStat.cardId, cardIds), gte(dailyStat.day, since(days))))
    .groupBy(dailyStat.cardId);
  return Object.fromEntries(rows.map((r) => [r.cardId!, r.total]));
}

export async function viewTotal(profileId: string, days = 30, db: Db = defaultDb): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${dailyStat.count}), 0)::int` })
    .from(dailyStat)
    .where(and(eq(dailyStat.kind, "view"), eq(dailyStat.profileId, profileId), gte(dailyStat.day, since(days))));
  return row?.total ?? 0;
}
