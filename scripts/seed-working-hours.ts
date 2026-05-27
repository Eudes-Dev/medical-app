/**
 * Script de seed idempotent des horaires d'ouverture par défaut (story 7.1).
 *
 * Usage: npx tsx scripts/seed-working-hours.ts
 *        (ou `npm run seed:working-hours`)
 *
 * Insère les horaires par défaut du cabinet :
 *   - Lundi → Vendredi (day_of_week 1→5) : une plage 08:00–18:00, créneaux 30 min, active
 *   - Samedi / Dimanche (0 et 6) : aucune ligne ⇒ fermés
 *
 * Idempotence : ne réinsère rien si la table `working_hours` contient déjà des lignes.
 * Doublonne le seed SQL embarqué dans la migration `20260526000003_add_working_hours`
 * afin de garantir des horaires sur un environnement provisionné autrement (AC 10).
 *
 * @module scripts/seed-working-hours
 */

import { prisma } from "@/lib/prisma";

/** Plage par défaut appliquée aux jours ouvrés (Lundi→Vendredi). */
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5] as const;
const DEFAULT_START = "08:00";
const DEFAULT_END = "18:00";
const DEFAULT_SLOT_DURATION = 30;

async function seedWorkingHours() {
  console.log("🌱 Seed des horaires d'ouverture par défaut...\n");

  const existing = await prisma.workingHours.count();
  if (existing > 0) {
    console.log(
      `ℹ️  La table working_hours contient déjà ${existing} ligne(s). Aucun seed appliqué (idempotent).`,
    );
    return;
  }

  await prisma.workingHours.createMany({
    data: DEFAULT_WEEKDAYS.map((dayOfWeek) => ({
      dayOfWeek,
      startTime: DEFAULT_START,
      endTime: DEFAULT_END,
      slotDuration: DEFAULT_SLOT_DURATION,
      active: true,
    })),
  });

  console.log(
    `✅ ${DEFAULT_WEEKDAYS.length} plages insérées (Lun→Ven ${DEFAULT_START}–${DEFAULT_END}, ${DEFAULT_SLOT_DURATION} min). Sam/Dim fermés.`,
  );
}

seedWorkingHours()
  .catch((err) => {
    console.error("❌ Erreur lors du seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
