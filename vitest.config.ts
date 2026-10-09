import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "src"),
  // `server-only` throws outside a React Server environment; it's a no-op for tests.
  "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
  "next/cache": path.resolve(__dirname, "tests/stubs/next-cache.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          fileParallelism: false,
          env: {
            DATABASE_URL: process.env.ITEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nfc_itest",
            CLAIM_CODE_SECRET: "itest-claim-secret",
            BETTER_AUTH_SECRET: "itest-auth-secret-0123456789abcdef0123456789",
            APP_ENV: "test",
            MAIL_OUTBOX_DIR: ".itest-outbox",
          },
        },
      },
    ],
  },
});
