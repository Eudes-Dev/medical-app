/**
 * Script de seed pour générer des données fictives
 * (patients + rendez-vous) destinées à tester les interfaces.
 *
 * Stratégie de génération :
 * - Patients : `createdAt` répartis entre le 1er janvier 2025 et aujourd'hui
 *   (~16 mois) pour alimenter les graphes d'évolution.
 * - Rendez-vous : concentrés sur une fenêtre de 2 mois centrée sur aujourd'hui
 *   (de J-30 à J+30) pour tester calendrier, dashboard et tables.
 * - Quelques rendez-vous "historiques" sont aussi semés (1/patient) pour
 *   alimenter les statistiques annuelles (top soins, heatmap, KPIs).
 *
 * Usage: npx tsx scripts/seed-demo-data.ts
 *
 * ATTENTION:
 * - Ne JAMAIS exécuter ce script en production.
 */

import * as dotenv from "dotenv";
import prisma from "../lib/prisma";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PRACTITIONER_EMAIL = "djeya.j@gmail.com";
const PRACTITIONER_NAME = "Dr. Eudes";

// Fenêtre temporelle des données générées
const HISTORY_START = new Date("2025-01-01T00:00:00.000Z");
const NOW = new Date();
// Fenêtre dense des rendez-vous : ±1 mois autour d'aujourd'hui = 2 mois
const APPT_WINDOW_START = (() => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - 30);
  return d;
})();
const APPT_WINDOW_END = (() => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + 30);
  return d;
})();

const PATIENTS_TO_CREATE = 80;

const FIRST_NAMES = [
  "Jean", "Marie", "Paul", "Sophie", "Luc", "Claire", "Thomas", "Julie",
  "Ahmed", "Lea", "Nadia", "Hugo", "Emma", "Lucas", "Manon", "Camille",
  "Antoine", "Sarah", "Mehdi", "Chloe", "Romain", "Ines", "Karim", "Alice",
  "Pierre", "Laura", "Yanis", "Eva", "Maxime", "Ophelie",
];

const LAST_NAMES = [
  "Martin", "Dupont", "Durand", "Moreau", "Lefevre", "Garcia", "Roux",
  "Fournier", "Girard", "Andre", "Mercier", "Blanc", "Guerin", "Muller",
  "Bernard", "Petit", "Robert", "Richard", "Bonnet", "Dubois", "Leroy",
  "Lambert", "Rousseau", "Vincent", "Faure", "Henry", "Chevalier",
];

const APPOINTMENT_TYPES = [
  "Première consultation",
  "Consultation de suivi",
  "Contrôle annuel",
  "Urgence",
  "Résultats d'examens",
  "Téléconsultation",
  "Bilan de santé",
];

type Status = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(probabilityTrue: number): boolean {
  return Math.random() < probabilityTrue;
}

function randomPhone(): string {
  let phone = "06";
  for (let i = 0; i < 8; i++) phone += randomInt(0, 9).toString();
  return phone;
}

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(randomInt(start.getTime(), end.getTime()));
}

function randomBirthDate(): Date {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 80);
  const end = new Date();
  end.setFullYear(end.getFullYear() - 10);
  return randomDateBetween(start, end);
}

/**
 * Pose un rendez-vous à une heure ouvrée valide (8h-18h, créneau de 15 min)
 * sur une date donnée, en évitant les week-ends.
 */
function snapToBusinessHours(date: Date): Date {
  const d = new Date(date);
  // Éviter samedi (6) et dimanche (0) → décaler au lundi
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1);
  else if (day === 6) d.setDate(d.getDate() + 2);

  const hour = randomInt(8, 17);
  const minute = randomChoice([0, 15, 30, 45]);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function generateAppointmentStatus(date: Date): Status {
  if (date > NOW) {
    const r = Math.random();
    if (r < 0.6) return "CONFIRMED";
    if (r < 0.9) return "PENDING";
    return "CANCELLED";
  }
  const r = Math.random();
  if (r < 0.75) return "COMPLETED";
  if (r < 0.9) return "CONFIRMED";
  return "CANCELLED";
}

async function ensurePractitionerUser() {
  const existing = await prisma.user.findUnique({
    where: { email: PRACTITIONER_EMAIL },
  });
  if (existing) {
    console.log(`👨‍⚕️ Praticien déjà présent: ${existing.email}`);
    return existing;
  }
  const created = await prisma.user.create({
    data: { email: PRACTITIONER_EMAIL, name: PRACTITIONER_NAME },
  });
  console.log(`👨‍⚕️ Praticien créé: ${created.email}`);
  return created;
}

async function clearExistingData() {
  if (IS_PRODUCTION) {
    console.error("❌ Refus d'exécuter le seed en production.");
    process.exit(1);
  }
  console.log("🧹 Nettoyage des anciens rendez-vous et patients...");
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
}

async function seedPatientsAndAppointments() {
  console.log(
    `👥 Création de ${PATIENTS_TO_CREATE} patients (créés entre ${HISTORY_START.toISOString().slice(0, 10)} et aujourd'hui)...`
  );

  let totalAppointments = 0;
  let denseWindowAppointments = 0;

  for (let i = 0; i < PATIENTS_TO_CREATE; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);

    const hasEmail = randomBool(0.75);
    const email = hasEmail
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}+t${i}@example.com`
      : null;

    // createdAt étalé entre HISTORY_START et NOW
    const createdAt = randomDateBetween(HISTORY_START, NOW);

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        phone: randomPhone(),
        email,
        dateOfBirth: randomBool(0.85) ? randomBirthDate() : null,
        notes: randomBool(0.25)
          ? "Patient fictif généré pour les tests."
          : null,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // 1) Rendez-vous historiques (1 à 3) entre createdAt et aujourd'hui
    //    → alimente top-soins, heatmap, statistiques annuelles
    const historyCount = randomInt(1, 3);
    for (let j = 0; j < historyCount; j++) {
      const start = snapToBusinessHours(randomDateBetween(createdAt, NOW));
      const durationMinutes = randomChoice([15, 30, 45, 60]);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      const status = generateAppointmentStatus(start);

      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          startTime: start,
          endTime: end,
          status,
          type: randomChoice(APPOINTMENT_TYPES),
          notes: randomBool(0.3) ? "RDV historique (seed)." : null,
        },
      });
      totalAppointments++;
    }

    // 2) Rendez-vous denses sur la fenêtre 2 mois (J-30 → J+30)
    //    Probabilité forte d'avoir au moins 1 RDV dans la fenêtre dense
    if (randomBool(0.85)) {
      const denseCount = randomInt(1, 4);
      for (let j = 0; j < denseCount; j++) {
        const start = snapToBusinessHours(
          randomDateBetween(APPT_WINDOW_START, APPT_WINDOW_END)
        );
        const durationMinutes = randomChoice([15, 30, 45, 60]);
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
        const status = generateAppointmentStatus(start);

        await prisma.appointment.create({
          data: {
            patientId: patient.id,
            startTime: start,
            endTime: end,
            status,
            type: randomChoice(APPOINTMENT_TYPES),
            notes: randomBool(0.4) ? "RDV (fenêtre dense)." : null,
          },
        });
        totalAppointments++;
        denseWindowAppointments++;
      }
    }
  }

  console.log(
    `📅 Total rendez-vous créés: ${totalAppointments} (dont ${denseWindowAppointments} sur la fenêtre 2 mois).`
  );
}

async function main() {
  console.log("🌱 Seed de données fictives (patients + rendez-vous)...");
  console.log(`   Fenêtre patients: ${HISTORY_START.toISOString().slice(0, 10)} → ${NOW.toISOString().slice(0, 10)}`);
  console.log(`   Fenêtre RDV dense: ${APPT_WINDOW_START.toISOString().slice(0, 10)} → ${APPT_WINDOW_END.toISOString().slice(0, 10)}`);

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL n'est pas définie.");
    process.exit(1);
  }

  await ensurePractitionerUser();
  await clearExistingData();
  await seedPatientsAndAppointments();

  console.log("✅ Seed terminé avec succès !");
}

main()
  .catch((err) => {
    console.error("❌ Erreur lors du seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
