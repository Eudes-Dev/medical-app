/**
 * Global setup Playwright (Story 3.6).
 *
 * - Charge `.env.test`
 * - Garde-fou anti-prod sur DATABASE_URL_TEST
 * - Reset + seed DB (via le script `reset-e2e-db.ts`)
 * - Authentifie le praticien et écrit le `storageState`
 */

import { chromium, type FullConfig } from "@playwright/test";
import { execSync } from "node:child_process";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";

import { loginAsPractitioner, STORAGE_STATE_PATH } from "./helpers/auth";

export default async function globalSetup(config: FullConfig) {
  dotenv.config({ path: ".env.test" });

  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST manquante (cf. .env.test.example).");
  const lower = url.toLowerCase();
  if (lower.includes("prod") || lower.includes("production")) {
    throw new Error("Garde-fou: DATABASE_URL_TEST pointe vers une base prod.");
  }

  // S'assurer que process.env.DATABASE_URL est aligné pour le webServer.
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = process.env.DIRECT_URL_TEST ?? url;

  // Reset + seed
  execSync("npm run test:e2e:db:reset", { stdio: "inherit" });

  // Auth -> storageState
  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await loginAsPractitioner(page);
  await browser.close();
}
