/**
 * Helper d'authentification Playwright (Story 3.6).
 *
 * `loginAsPractitioner(page)` se connecte via le formulaire `/login` puis
 * persiste l'état d'auth dans un `storageState.json` réutilisable par les
 * projects Playwright. Appelé une seule fois depuis `global-setup.ts`.
 */

import { type Page, expect } from "@playwright/test";
import * as path from "node:path";

export const STORAGE_STATE_PATH = path.join(
  __dirname,
  "..",
  ".auth",
  "practitioner.json"
);

export async function loginAsPractitioner(page: Page) {
  const email = process.env.E2E_PRACTITIONER_EMAIL;
  const password = process.env.E2E_PRACTITIONER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_PRACTITIONER_EMAIL / E2E_PRACTITIONER_PASSWORD manquants. Charger .env.test."
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: /Se connecter/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
}
