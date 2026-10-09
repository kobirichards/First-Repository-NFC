import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export default async function setup() {
  const url = process.env.ITEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nfc_itest";
  if (!/_itest\b|_test\b/.test(url)) throw new Error(`Refusing to reset a non-test database: ${url}`);
  const pool = new Pool({ connectionString: url });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
