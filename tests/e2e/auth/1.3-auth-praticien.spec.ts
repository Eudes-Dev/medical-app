/**
 * E2E Story 1.3 — Authentification praticien (Story 5.2, AC 11).
 *
 * Override du storageState pour repartir d'un état non connecté.
 */

import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("1.3 — Auth praticien", () => {
  // AC: 5.2-E2E-010 (connexion valide → /dashboard)
  test("connexion avec identifiants valides → /dashboard", async ({ page }) => {
    const email = process.env.E2E_PRACTITIONER_EMAIL;
    const password = process.env.E2E_PRACTITIONER_PASSWORD;
    test.skip(!email || !password, "E2E_PRACTITIONER_* manquants (.env.test).");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /Se connecter/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  // AC: 5.2-E2E-011 (credentials invalides → message d'erreur visible)
  test("identifiants invalides → message d'erreur dans le formulaire", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("inconnu@test.local");
    await page.getByLabel("Mot de passe").fill("WrongPass!2026");
    await page.getByRole("button", { name: /Se connecter/i }).click();

    await expect(
      page.getByText(/Email ou mot de passe incorrect/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  // AC: 5.2-E2E-012 (déconnexion → retour /login)
  test("déconnexion via le menu utilisateur → retour /login", async ({ page }) => {
    const email = process.env.E2E_PRACTITIONER_EMAIL;
    const password = process.env.E2E_PRACTITIONER_PASSWORD;
    test.skip(!email || !password, "E2E_PRACTITIONER_* manquants (.env.test).");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: /Se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Le bouton "Se déconnecter" est dans un DropdownMenu (NavUser).
    // On l'ouvre via le trigger, puis on clique sur l'item.
    const userMenuTrigger = page.getByRole("button").filter({
      has: page.locator('[data-slot="avatar"], [data-radix-collection-item]'),
    }).first();
    // Fallback robuste : on cherche directement l'item visible.
    const logoutItem = page.getByRole("menuitem", { name: /Se déconnecter/i });
    if (!(await logoutItem.isVisible().catch(() => false))) {
      await userMenuTrigger.click().catch(() => {});
    }
    await page.getByRole("menuitem", { name: /Se déconnecter/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
