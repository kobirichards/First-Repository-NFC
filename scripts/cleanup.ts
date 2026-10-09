/** Daily housekeeping: `npm run cleanup`. Schedule it (e.g. Vercel Cron or a GitHub Action). See src/server/maintenance.ts. */
import "dotenv/config";
import { runCleanup } from "../src/server/maintenance";

runCleanup()
  .then((result) => {
    console.info("Cleanup done:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
