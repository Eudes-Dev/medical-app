/**
 * E2E Story 1.3 — Protection des routes /dashboard/* (Story 5.2, AC 12).
 *
 * Vérifie que sans cookie de session, les routes du dashboard redirigent
 * vers /login. La partie "post-login" est traitée dans un fichier dédié
 * (Playwright n'honore `storageState` qu'au niveau fichier — cf. Risque R3
 * du document story).
 */

import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/patients",
  "/dashboard/calendar",
];

test.describe("1.3 — Protection des routes (non authentifié)", () => {
  for (const route of PROTECTED_ROUTES) {
    // AC: 5.2-E2E-020/021/022 (3 routes protégées → /login)
    test(`GET ${route} sans cookie redirige vers /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }
});
