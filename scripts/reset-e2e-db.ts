/**
 * Reset complet de la DB E2E + seed dédié.
 *
 * Usage: npm run test:e2e:db:reset
 *
 * Étapes:
 *   1. Charger `.env.test`
 *   2. Garde-fou anti-prod
 *   3. `prisma migrate reset --force --skip-seed` contre DATABASE_URL_TEST
 *   4. `tsx prisma/seed-e2e.ts`
 */

import { execSync } from "node:child_process";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: ".env.test" });

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  console.error("❌ DATABASE_URL_TEST manquante. Copier .env.test.example → .env.test.");
  process.exit(1);
}

const lower = url.toLowerCase();
if (lower.includes("prod") || lower.includes("production")) {
  console.error("❌ Garde-fou: DATABASE_URL_TEST contient 'prod' ou 'production'. Refus de démarrage.");
  process.exit(1);
}

console.log("🧹 Reset DB E2E (DATABASE_URL_TEST)…");

const env = {
  ...process.env,
  DATABASE_URL: url,
  DIRECT_URL: process.env.DIRECT_URL_TEST ?? url,
};

execSync("npx prisma migrate reset --force --skip-seed", {
  stdio: "inherit",
  env,
});

console.log("🌱 Seed E2E…");
execSync(`tsx ${path.join("prisma", "seed-e2e.ts")}`, {
  stdio: "inherit",
  env,
});

console.log("✅ DB E2E prête.");
