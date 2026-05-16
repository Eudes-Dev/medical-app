/**
 * Specs Playwright Story 3.2 — Vue Calendrier.
 *
 * Test design : docs/qa/assessments/3.2-test-design-20260129.md
 */

import { test, expect } from "@playwright/test";

test.describe("3.2 — Vue Calendrier", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/calendar");
  });

  // AC: 3.2-E2E-001 (affichage RDV + header)
  test("affiche le header (titre période + contrôles) et la grille", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Période précédente" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aller à aujourd'hui" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Période suivante" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    // Un RDV du seed (patient Alice Martin à 9h aujourd'hui en PENDING)
    await expect(page.getByLabel(/Rendez-vous Alice Martin/i).first()).toBeVisible();
  });

  // AC: 3.2-E2E-005 (navigation prev/next/today)
  test("les boutons précédent / suivant / aujourd'hui changent la période", async ({ page }) => {
    const title = page.getByRole("heading", { level: 2 });
    const initial = (await title.textContent())?.trim() ?? "";

    await page.getByRole("button", { name: "Période suivante" }).click();
    await expect(title).not.toHaveText(initial);

    await page.getByRole("button", { name: "Aller à aujourd'hui" }).click();
    await expect(title).toHaveText(initial);
  });

  // AC: 3.2-E2E-002 + 3.2-E2E-003 (switch vue jour/semaine)
  test("le sélecteur de vue bascule entre Jour et Semaine", async ({ page }) => {
    const dayBtn = page.getByRole("button", { name: "Vue Jour" });
    const weekBtn = page.getByRole("button", { name: "Vue Semaine" });

    await dayBtn.click();
    await expect(dayBtn).toHaveAttribute("aria-pressed", "true");

    await weekBtn.click();
    await expect(weekBtn).toHaveAttribute("aria-pressed", "true");
    await expect(dayBtn).toHaveAttribute("aria-pressed", "false");
  });
});

// AC: 3.2-E2E-004 (responsive mobile — exécuté uniquement sur le project mobile)
test.describe("3.2 — Responsive mobile", () => {
  test("clic sur un RDV ouvre le détail (Sheet mobile)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "Scénario réservé au project mobile-chromium"
    );
    await page.goto("/dashboard/calendar");
    await page.getByLabel(/Rendez-vous Alice Martin/i).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Alice Martin/)).toBeVisible();
  });
});
