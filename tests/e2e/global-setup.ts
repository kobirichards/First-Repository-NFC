import { rm } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Fresh test database and empty outbox before every run. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nfc_test";
  if (!/nfc_test|_test\b/.test(url)) throw new Error(`Refusing to reset a non-test database: ${url}`);
  const pool = new Pool({ connectionString: url });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  // A small catalogue: one product with two finishes in all currencies.
  await pool.query(`
    INSERT INTO product (id, slug, name, description, customisable, sort_order) VALUES
      ('prod-classic', 'classic', 'Classic card', 'A sturdy PVC card with an NFC chip.', true, 0);
    INSERT INTO product_option (id, product_id, slug, name, description, sort_order) VALUES
      ('opt-black', 'prod-classic', 'matte-black', 'Matte black', 'Soft-touch black.', 0),
      ('opt-green', 'prod-classic', 'bottle-green', 'Bottle green', 'Deep green.', 1);
    INSERT INTO price (id, product_id, option_id, currency, amount) VALUES
      ('pr-gbp', 'prod-classic', NULL, 'GBP', 2400),
      ('pr-eur', 'prod-classic', NULL, 'EUR', 2800),
      ('pr-usd', 'prod-classic', NULL, 'USD', 2900),
      ('pr-green-gbp', 'prod-classic', 'opt-green', 'GBP', 2600);
  `);
  await pool.end();
  await rm(".e2e-outbox", { recursive: true, force: true });
}
