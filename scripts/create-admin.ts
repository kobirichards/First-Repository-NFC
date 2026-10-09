/**
 * Creates the first admin, or promotes an existing account:
 *
 *   npm run admin:create -- --email you@company.com --name "Your Name"
 *
 * New accounts get a random password, printed once. On first visit to /admin
 * the admin must set up an authenticator app; nothing else is reachable until then.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Admin";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run admin:create -- --email you@company.com --name "Your Name"');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
  if (existing) {
    await db.update(schema.user).set({ role: "admin" }).where(eq(schema.user.id, existing.id));
    await db.insert(schema.auditEvent).values({ actorId: null, action: "user.promote_admin", entityType: "user", entityId: existing.id, before: { role: existing.role }, after: { role: "admin", via: "cli" } });
    console.info(`${email} is now an admin. They must set up two-step verification at /admin on next visit.`);
  } else {
    const password = randomBytes(18).toString("base64url");
    const id = crypto.randomUUID();
    await db.insert(schema.user).values({ id, email, name, role: "admin", emailVerified: true });
    await db.insert(schema.account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
    await db.insert(schema.auditEvent).values({ actorId: null, action: "user.create_admin", entityType: "user", entityId: id, before: null, after: { email, via: "cli" } });
    console.info(`Admin created: ${email}`);
    console.info(`Temporary password (shown once): ${password}`);
    console.info("Sign in, set up two-step verification at /admin, then change the password in Account settings.");
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
