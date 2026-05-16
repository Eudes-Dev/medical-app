import { defineConfig, devices } from "@playwright/test";
import path from "path";

const STORAGE_STATE = path.join(__dirname, "tests/e2e/.auth/practitioner.json");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["iPhone 13"],
        storageState: STORAGE_STATE,
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
      DIRECT_URL: process.env.DATABASE_URL_TEST ?? "",
    },
  },
});
