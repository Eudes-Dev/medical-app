/**
 * Seed dédié à la suite E2E (Story 3.6).
 *
 * - Crée le praticien de test dans Supabase Auth (service_role) et dans la table `users`.
 * - Crée des patients et rendez-vous couvrant les statuts PENDING / CONFIRMED / CANCELLED
 *   sur la journée courante et la semaine en cours.
 *
 * À exécuter uniquement contre DATABASE_URL_TEST (garde-fou dans `reset-e2e-db.ts`).
 */

import * as dotenv from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { addDays, addMinutes, setHours, setMinutes, startOfDay, startOfWeek } from "date-fns";

dotenv.config({ path: ".env.test" });

const E2E_EMAIL = process.env.E2E_PRACTITIONER_EMAIL ?? "practitioner-e2e@test.local";
const E2E_PASSWORD = process.env.E2E_PRACTITIONER_PASSWORD ?? "E2ePass!2026";
const E2E_NAME = process.env.E2E_PRACTITIONER_NAME ?? "Dr. E2E Tester";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_TEST ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY_TEST ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

async function upsertSupabaseUser(): Promise<string> {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase Auth: variables manquantes (NEXT_PUBLIC_SUPABASE_URL_TEST / SUPABASE_SERVICE_ROLE_KEY_TEST)."
    );
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === E2E_EMAIL);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { name: E2E_NAME },
    });
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { name: E2E_NAME },
  });
  if (error || !data.user) throw error ?? new Error("Création utilisateur Supabase impossible");
  return data.user.id;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_TEST manquante.");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    const authUserId = await upsertSupabaseUser();

    await prisma.user.upsert({
      where: { email: E2E_EMAIL },
      update: { name: E2E_NAME },
      create: { id: authUserId, email: E2E_EMAIL, name: E2E_NAME },
    });

    // Patients de test
    const patients = await Promise.all([
      prisma.patient.create({
        data: {
          firstName: "Alice",
          lastName: "Martin",
          phone: "0611111111",
          email: "alice.martin@test.local",
          optOutToken: "e2e-opt-out-token-alice",
        },
      }),
      prisma.patient.create({
        data: {
          firstName: "Bob",
          lastName: "Durand",
          phone: "0622222222",
          email: "bob.durand@test.local",
          optOutToken: "e2e-opt-out-token-bob",
        },
      }),
      prisma.patient.create({
        data: {
          firstName: "Chloé",
          lastName: "Petit",
          phone: "0633333333",
          optOutToken: "e2e-opt-out-token-chloe",
        },
      }),
    ]);

    const today = startOfDay(new Date());
    const monday = startOfWeek(today, { weekStartsOn: 1 });

    // Aujourd'hui : un PENDING, un CONFIRMED, un CANCELLED
    await prisma.appointment.createMany({
      data: [
        {
          patientId: patients[0].id,
          startTime: setMinutes(setHours(today, 9), 0),
          endTime: setMinutes(setHours(today, 9), 30),
          status: "PENDING",
          type: "Consultation de suivi",
          // Token d'annulation pour les RDV créés via le tunnel public (story 6.1)
          cancellationToken: "e2e-cancel-token-alice-today",
        },
        {
          patientId: patients[1].id,
          startTime: setMinutes(setHours(today, 10), 0),
          endTime: setMinutes(setHours(today, 10), 30),
          status: "CONFIRMED",
          type: "Première consultation",
        },
        {
          patientId: patients[2].id,
          startTime: setMinutes(setHours(today, 11), 0),
          endTime: setMinutes(setHours(today, 11), 30),
          status: "CANCELLED",
          type: "Consultation de suivi",
        },
      ],
    });

    // Semaine en cours : 2 RDV répartis pour valider la vue semaine
    await prisma.appointment.createMany({
      data: [
        {
          patientId: patients[0].id,
          startTime: setMinutes(setHours(addDays(monday, 2), 14), 0),
          endTime: addMinutes(setMinutes(setHours(addDays(monday, 2), 14), 0), 45),
          status: "CONFIRMED",
          type: "Consultation",
        },
        {
          patientId: patients[1].id,
          startTime: setMinutes(setHours(addDays(monday, 4), 16), 30),
          endTime: addMinutes(setMinutes(setHours(addDays(monday, 4), 16), 30), 30),
          status: "PENDING",
          type: "Consultation",
        },
      ],
    });

    console.log(`✅ Seed E2E: praticien ${E2E_EMAIL} + ${patients.length} patients + 5 RDV.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
