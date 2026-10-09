import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_OUTBOX = ".e2e-outbox";
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nfc_test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // A UK visitor, so the default currency is GBP (see currencyFromAcceptLanguage).
    locale: "en-GB",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Accessibility checks also run at phone size.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /a11y\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_ENV: "test",
      APP_URL: `http://localhost:${PORT}`,
      CARD_DOMAIN: `http://localhost:${PORT}`,
      DATABASE_URL: testDatabaseUrl,
      BETTER_AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
      CLAIM_CODE_SECRET: "e2e-only-claim-secret-0123456789abcdef0123",
      EMAIL_PROVIDER: "console",
      MAIL_OUTBOX_DIR: E2E_OUTBOX,
      E2E_RELAX_RATE_LIMITS: "true",
    },
  },
});
