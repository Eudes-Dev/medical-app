/**
 * Script de seed pour générer des données fictives
 * (patients + rendez-vous) sur 1 an.
 *
 * Usage: npx tsx scripts/seed-demo-data.ts
 *
 * Ce script :
 * - Nettoie les patients et rendez-vous existants (en dev uniquement)
 * - Crée un praticien dans la table `users` si nécessaire
 * - Génère des patients fictifs
 * - Crée des rendez-vous répartis sur ~1 an (passé + futur proche)
 *
 * ATTENTION:
 * - Ne JAMAIS exécuter ce script en production.
 */

import * as dotenv from "dotenv";
import prisma from "../lib/prisma";

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: ".env.local" });

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Utilisateur praticien de référence (doit correspondre à l'utilisateur Supabase de test)
const PRACTITIONER_EMAIL = "djeya.j@gmail.com";
const PRACTITIONER_NAME = "Dr. Eudes";

// Petits jeux de données pour générer des noms/infos réalistes
const FIRST_NAMES = [
  "Jean",
  "Marie",
  "Paul",
  "Sophie",
  "Luc",
  "Claire",
  "Thomas",
  "Julie",
  "Ahmed",
  "Lea",
  "Nadia",
  "Hugo",
  "Emma",
  "Lucas",
  "Manon",
];

const LAST_NAMES = [
  "Martin",
  "Dupont",
  "Durand",
  "Moreau",
  "Lefevre",
  "Garcia",
  "Roux",
  "Fournier",
  "Girard",
  "Andre",
  "Lefevre",
  "Mercier",
  "Blanc",
  "Guerin",
  "Muller",
];

const APPOINTMENT_TYPES = [
  "Première consultation",
  "Consultation de suivi",
  "Contrôle annuel",
  "Urgence",
  "Résultats d'examens",
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
  // Format simple : 06XXXXXXXX
  let phone = "06";
  for (let i = 0; i < 8; i++) {
    phone += randomInt(0, 9).toString();
  }
  return phone;
}

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = randomInt(startTime, endTime);
  return new Date(randomTime);
}

function randomBirthDate(): Date {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 80); // il y a 80 ans
  const end = new Date();
  end.setFullYear(end.getFullYear() - 10); // il y a 10 ans
  return randomDateBetween(start, end);
}

function generateAppointmentStatus(date: Date, now: Date): Status {
  if (date > now) {
    // Rendez-vous futurs : majoritairement confirmés / en attente
    const r = Math.random();
    if (r < 0.6) return "CONFIRMED";
    if (r < 0.9) return "PENDING";
    return "CANCELLED";
  }

  // Rendez-vous passés : majoritairement complétés / quelques annulés
  const r = Math.random();
  if (r < 0.7) return "COMPLETED";
  if (r < 0.9) return "CONFIRMED";
  return "CANCELLED";
}

async function ensurePractitionerUser() {
  // Créer ou récupérer le praticien dans la table `users`
  const existing = await prisma.user.findUnique({
    where: { email: PRACTITIONER_EMAIL },
  });

  if (existing) {
    console.log(`👨‍⚕️ Utilisateur praticien déjà présent: ${existing.email}`);
    return existing;
  }

  const created = await prisma.user.create({
    data: {
      email: PRACTITIONER_EMAIL,
      name: PRACTITIONER_NAME,
    },
  });

  console.log(
    `👨‍⚕️ Utilisateur praticien créé dans la table users: ${created.email}`
  );

  return created;
}

async function clearExistingData() {
  if (IS_PRODUCTION) {
    console.error(
      "❌ Refus d'exécuter le seed de données fictives en production."
    );
    process.exit(1);
  }

  console.log("🧹 Nettoyage des anciens rendez-vous et patients...");
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
}

async function seedPatientsAndAppointments() {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  // Légèrement dans le futur pour tester les rendez-vous à venir
  const futureHorizon = new Date();
  futureHorizon.setDate(futureHorizon.getDate() + 30);

  const patientsToCreate = 50;

  console.log(`👥 Création de ${patientsToCreate} patients fictifs...`);

  for (let i = 0; i < patientsToCreate; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);

    const hasEmail = randomBool(0.7);
    const email = hasEmail
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}+test${i}@example.com`
      : null;

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        phone: randomPhone(),
        email,
        dateOfBirth: randomBool(0.8) ? randomBirthDate() : null,
        notes: randomBool(0.3)
          ? "Patient fictif généré pour les tests."
          : null,
      },
    });

    const appointmentsCount = randomInt(1, 8);

    console.log(
      `  - ${firstName} ${lastName}: création de ${appointmentsCount} rendez-vous...`
    );

    for (let j = 0; j < appointmentsCount; j++) {
      // Date aléatoire entre il y a 1 an et dans 30 jours
      const start = randomDateBetween(oneYearAgo, futureHorizon);

      // Heures entre 8h et 18h
      const hour = randomInt(8, 17);
      const minute = randomChoice([0, 15, 30, 45]);
      start.setHours(hour, minute, 0, 0);

      const durationMinutes = randomChoice([15, 30, 45, 60]);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

      const status = generateAppointmentStatus(start, now);
      const type = randomChoice(APPOINTMENT_TYPES);

      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          startTime: start,
          endTime: end,
          status,
          type,
          notes: randomBool(0.4)
            ? "Rendez-vous fictif (seed de test)."
            : null,
        },
      });
    }
  }
}

async function main() {
  console.log("🌱 Seed de données fictives (patients + rendez-vous)...");

  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ DATABASE_URL n'est pas définie dans les variables d'environnement."
    );
    console.error(
      "   Vérifiez votre fichier .env.local (DATABASE_URL) avant de lancer le seed."
    );
    process.exit(1);
  }

  await ensurePractitionerUser();
  await clearExistingData();
  await seedPatientsAndAppointments();

  console.log("✅ Seed terminé avec succès !");
}

main()
  .catch((err) => {
    console.error("❌ Erreur lors du seed de données fictives:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

