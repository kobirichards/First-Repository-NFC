/** Applies pending migrations from ./drizzle. Used by `npm run db:migrate` and CI. */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.info("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
