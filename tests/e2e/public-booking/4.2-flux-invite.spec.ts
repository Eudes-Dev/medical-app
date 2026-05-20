/**
 * E2E Story 4.2 — Flux de réservation invité (non authentifié).
 *
 * Couvre AC 10 de la story 5.2 : sélection date + créneau + GuestForm
 * + écran de succès, plus erreurs validation client et SLOT_TAKEN.
 *
 * Note d'implémentation (story 5.2) :
 *  - Override `storageState` : le tunnel invité est strictement non
 *    authentifié, on repart d'un contexte vide.
 *  - Voie retenue pour le conflit SLOT_TAKEN : insertion directe via
 *    `prisma.appointment.create` dans `test.beforeEach` (cf. Completion Notes).
 *    Le webServer Playwright force déjà `DATABASE_URL=DATABASE_URL_TEST`.
 */

import { test, expect } from "@playwright/test";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

test.use({ storageState: { cookies: [], origins: [] } });

const CABINET_SLUG = "cabinet";

function prismaForTest(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL_TEST manquante (.env.test).");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

test.describe("4.2 — Flux réservation invité", () => {
  // AC: 5.2-E2E-001 (nominal : landing → calendrier → GuestForm → success)
  test("réservation invité aboutit à l'écran de succès", async ({ page }) => {
    await page.goto(`/${CABINET_SLUG}`);
    await expect(page).toHaveURL(new RegExp(`/${CABINET_SLUG}$`));

    await page.goto(`/${CABINET_SLUG}/book`);
    await expect(
      page.getByRole("heading", { name: /Choisissez votre rendez-vous/i }),
    ).toBeVisible();

    // Sélection d'un créneau (le premier disponible — horizon ≤ 90j garanti
    // car la landing limite à 14 jours).
    const firstSlot = page
      .getByRole("radio")
      .filter({ hasText: /^\d{2}:\d{2}$/ })
      .first();
    await firstSlot.waitFor({ state: "visible" });
    await firstSlot.click();

    await page.getByRole("button", { name: /Continuer/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${CABINET_SLUG}/book/guest$`));

    // Formulaire GuestForm — valeurs valides.
    await page.getByLabel("Prénom").fill("Eve");
    await page.getByLabel("Nom").fill("Testeuse");
    await page.getByLabel("Téléphone").fill("06 12 34 56 78");
    await page.getByLabel("Email").fill(`eve.testeuse+${Date.now()}@test.local`);

    await page.getByRole("button", { name: /Confirmer mon rendez-vous/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`/${CABINET_SLUG}/book/success$`),
      { timeout: 10_000 },
    );
  });

  // AC: 5.2-E2E-002 (validation client : téléphone trop court → toast error)
  test("téléphone invalide affiche un toast d'erreur", async ({ page }) => {
    await page.goto(`/${CABINET_SLUG}/book`);

    const firstSlot = page
      .getByRole("radio")
      .filter({ hasText: /^\d{2}:\d{2}$/ })
      .first();
    await firstSlot.waitFor({ state: "visible" });
    await firstSlot.click();
    await page.getByRole("button", { name: /Continuer/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${CABINET_SLUG}/book/guest$`));

    await page.getByLabel("Prénom").fill("Eve");
    await page.getByLabel("Nom").fill("Testeuse");
    await page.getByLabel("Téléphone").fill("0612"); // trop court
    await page.getByLabel("Email").fill("eve@test.local");
    await page.getByRole("button", { name: /Confirmer mon rendez-vous/i }).click();

    // Erreur Zod côté client (inline) OU toast error — accepter l'un ou l'autre.
    const inlineError = page.getByText(/Téléphone français invalide/i);
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(inlineError.or(errorToast).first()).toBeVisible();
  });

  // AC: 5.2-E2E-003 (conflit SLOT_TAKEN : créneau pré-occupé → toast erreur)
  test("conflit de créneau (SLOT_TAKEN) → toast erreur générique", async ({ page }) => {
    // Pré-seed d'un RDV occupant le créneau J+1 à 09:00 sur DATABASE_URL_TEST.
    const prisma = prismaForTest();
    const slot = setMinutes(setHours(startOfDay(addDays(new Date(), 1)), 9), 0);

    let patientId: string | null = null;
    try {
      const patient = await prisma.patient.create({
        data: {
          firstName: "Conflit",
          lastName: "E2E",
          phone: "0699999999",
          email: `conflit+${Date.now()}@test.local`,
        },
        select: { id: true },
      });
      patientId = patient.id;

      await prisma.appointment.create({
        data: {
          patientId,
          startTime: slot,
          endTime: new Date(slot.getTime() + 30 * 60_000),
          status: "CONFIRMED",
          type: "Première consultation",
        },
      });

      // Naviguer directement sur /guest avec le slot occupé via le store.
      // Pour la simplicité on parcourt l'UI : on choisit la même date + slot.
      await page.goto(`/${CABINET_SLUG}/book`);

      // Sélection de la date J+1 dans le rail (2ᵉ carte).
      const dateButtons = page.getByRole("radio", {
        name: /./, // n'importe quel label de date
      });
      await dateButtons.nth(1).waitFor({ state: "visible" });
      await dateButtons.nth(1).click();

      // Le créneau 09:00 ne doit pas apparaître (collision) → on simule en
      // injectant directement la sélection : si 09:00 absent, on prend le 1er
      // dispo, on remplit le form, et on vérifie qu'aucune erreur ne survient.
      // Pour réellement déclencher SLOT_TAKEN il faut sélectionner un créneau
      // qui DEVIENT occupé entre la sélection et la soumission. On crée donc
      // une 2ᵉ collision après le clic.
      const targetSlot = page
        .getByRole("radio")
        .filter({ hasText: /^\d{2}:\d{2}$/ })
        .first();
      await targetSlot.waitFor({ state: "visible" });
      const slotLabel = (await targetSlot.textContent())?.trim() ?? "";
      await targetSlot.click();
      await page.getByRole("button", { name: /Continuer/i }).click();

      // Avant submit, on injecte un RDV pour ce créneau-là afin de provoquer
      // un SLOT_TAKEN à la soumission.
      const [hh, mm] = slotLabel.split(":").map((n) => parseInt(n, 10));
      const collisionStart = setMinutes(
        setHours(startOfDay(addDays(new Date(), 1)), hh),
        mm,
      );
      await prisma.appointment.create({
        data: {
          patientId,
          startTime: collisionStart,
          endTime: new Date(collisionStart.getTime() + 30 * 60_000),
          status: "CONFIRMED",
          type: "Première consultation",
        },
      });

      await page.getByLabel("Prénom").fill("Eve");
      await page.getByLabel("Nom").fill("Testeuse");
      await page.getByLabel("Téléphone").fill("06 12 34 56 78");
      await page
        .getByLabel("Email")
        .fill(`slot.taken+${Date.now()}@test.local`);
      await page.getByRole("button", { name: /Confirmer mon rendez-vous/i }).click();

      // Toast erreur : « Ce créneau vient d'être réservé… »
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToast.first()).toBeVisible({ timeout: 10_000 });
    } finally {
      // Nettoyage : on enlève les RDV de collision créés pour ce test
      // (le seed reset garantit aussi un état propre entre runs).
      if (patientId) {
        await prisma.appointment.deleteMany({ where: { patientId } });
        await prisma.patient.delete({ where: { id: patientId } }).catch(() => {});
      }
      await prisma.$disconnect();
    }
  });
});
