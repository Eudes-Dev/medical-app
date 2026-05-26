/**
 * E2E Story 1.3 — Accès aux routes /dashboard/* avec session active.
 *
 * Pendant de `1.3-protection-routes.spec.ts` — ici on utilise le storageState
 * par défaut du project Playwright (praticien connecté via global-setup),
 * donc PAS d'override `test.use({ storageState: ... })`. Split en fichier
 * dédié car Playwright n'honore `storageState` qu'au niveau fichier
 * (cf. Risque R3 de la story 5.2).
 */

import { test, expect } from "@playwright/test";

test.describe("1.3 — Protection des routes (authentifié)", () => {
  // AC: 5.2-E2E-023 (dashboard accessible)
  test("/dashboard répond avec la page tableau de bord", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  // AC: 5.2-E2E-024 (patients accessibles)
  test("/dashboard/patients répond avec la liste des patients", async ({ page }) => {
    await page.goto("/dashboard/patients");
    await expect(page).toHaveURL(/\/dashboard\/patients/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  // AC: 5.2-E2E-025 (calendrier accessible)
  test("/dashboard/calendar répond avec le calendrier", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await expect(page).toHaveURL(/\/dashboard\/calendar/);
    await expect(
      page.getByRole("button", { name: "Aller à aujourd'hui" }),
    ).toBeVisible();
  });
});
