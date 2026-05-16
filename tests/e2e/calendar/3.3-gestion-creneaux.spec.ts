/**
 * Specs Playwright Story 3.3 — Gestion des créneaux.
 *
 * Test design : docs/qa/assessments/3.3-test-design-20260130.md
 */

import { test, expect } from "@playwright/test";

test.describe("3.3 — Gestion des créneaux", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/calendar");
    // S'assure d'être en vue Jour pour cliquer un créneau précis
    await page.getByRole("button", { name: "Vue Jour" }).click();
  });

  // AC: 3.3-E2E-001
  test("clic sur un créneau vide ouvre la modal de création avec date/heure pré-remplies", async ({
    page,
  }) => {
    const emptySlot = page.getByRole("button", { name: /Créer un rendez-vous à 13:00/i });
    await emptySlot.first().click();

    const dialog = page.getByRole("dialog", { name: /Nouveau rendez-vous/i });
    await expect(dialog).toBeVisible();
    // Heure 13:00 pré-remplie (champ time)
    await expect(dialog.getByLabel(/Heure/i)).toHaveValue(/13:00/);
  });

  // AC: 3.3-E2E-002
  test("recherche d'un patient existant dans le combobox", async ({ page }) => {
    await page.getByRole("button", { name: /Créer un rendez-vous à 13:30/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /Nouveau rendez-vous/i });

    await dialog.getByLabel(/Patient/i).click();
    await page.getByPlaceholder(/Rechercher/i).fill("Alice");
    await expect(page.getByRole("option", { name: /Alice Martin/i })).toBeVisible();
    await page.getByRole("option", { name: /Alice Martin/i }).click();
    await expect(dialog.getByText(/Alice Martin/)).toBeVisible();
  });

  // AC: 3.3-E2E-003
  test("création d'un nouveau patient depuis la modal RDV", async ({ page }) => {
    await page.getByRole("button", { name: /Créer un rendez-vous à 14:00/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /Nouveau rendez-vous/i });

    await dialog.getByLabel(/Patient/i).click();
    await page.getByRole("button", { name: /Nouveau patient/i }).click();

    const newPatientDialog = page.getByRole("dialog", { name: /Nouveau patient/i });
    await newPatientDialog.getByLabel(/Prénom/i).fill("Daniel");
    await newPatientDialog.getByLabel(/Nom/i).fill("Robert");
    await newPatientDialog.getByLabel(/Téléphone/i).fill("0644444444");
    await newPatientDialog.getByRole("button", { name: /Enregistrer|Créer/i }).click();

    await expect(dialog.getByText(/Daniel Robert/)).toBeVisible();
  });

  // AC: 3.3-E2E-004 (conflit horaire)
  test("soumission sur un créneau occupé affiche un toast d'erreur", async ({ page }) => {
    // Le seed place un RDV PENDING à 09:00. On tente d'en recréer un sur le même créneau.
    await page.getByRole("button", { name: /Créer un rendez-vous à 09:00/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /Nouveau rendez-vous/i });

    await dialog.getByLabel(/Patient/i).click();
    await page.getByPlaceholder(/Rechercher/i).fill("Bob");
    await page.getByRole("option", { name: /Bob Durand/i }).click();
    await dialog.getByLabel(/Type/i).fill("Consultation");
    await dialog.getByRole("button", { name: /Créer|Enregistrer/i }).click();

    await expect(page.getByRole("status").filter({ hasText: /conflit|occupé/i })).toBeVisible();
  });

  // AC: 3.3-E2E-005 (création réussie)
  test("création réussie : toast succès + RDV visible dans la grille", async ({ page }) => {
    await page.getByRole("button", { name: /Créer un rendez-vous à 15:00/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /Nouveau rendez-vous/i });

    await dialog.getByLabel(/Patient/i).click();
    await page.getByPlaceholder(/Rechercher/i).fill("Chloé");
    await page.getByRole("option", { name: /Chloé Petit/i }).click();
    await dialog.getByLabel(/Type/i).fill("Consultation");
    await dialog.getByRole("button", { name: /Créer|Enregistrer/i }).click();

    await expect(page.getByRole("status").filter({ hasText: /créé/i })).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel(/Rendez-vous Chloé Petit à 15:00/i)).toBeVisible();
  });

  // AC: 3.3-E2E-006
  test("clic sur un RDV existant ouvre détails + actions", async ({ page }) => {
    await page.getByLabel(/Rendez-vous Bob Durand à 10:00/i).click();
    const dialog = page.getByRole("dialog");

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Bob Durand/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Modifier/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Supprimer/i })).toBeVisible();
  });
});
