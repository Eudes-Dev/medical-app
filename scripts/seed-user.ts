/**
 * Script de seed pour créer un utilisateur de test
 *
 * Usage: npx tsx scripts/seed-user.ts
 *
 * Crée un utilisateur praticien de test dans Supabase Auth.
 * Nécessite la variable SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Charger les variables d'environnement (.env.local prioritaire, sinon .env)
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables d'environnement manquantes:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nAjoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local");
  console.error("(Dashboard Supabase > Project Settings > API > service_role key)");
  process.exit(1);
}

// Client Supabase Admin avec service_role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Utilisateur de test (surchargeable via .env : SEED_USER_EMAIL / SEED_USER_PASSWORD)
const TEST_USER = {
  email: process.env.SEED_USER_EMAIL ?? "djeya.j@gmail.com",
  password: process.env.SEED_USER_PASSWORD ?? "Test123!",
  name: "Dr. Eudes",
};

async function seedUser() {
  console.log("🌱 Création de l'utilisateur de test...\n");

  // Vérifier si l'utilisateur existe déjà
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const userExists = existingUsers?.users?.some(
    (u) => u.email === TEST_USER.email
  );

  if (userExists) {
    console.log("ℹ️  L'utilisateur existe déjà:");
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    return;
  }

  // Créer l'utilisateur
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true, // Confirmer l'email automatiquement
    user_metadata: {
      name: TEST_USER.name,
    },
  });

  if (error) {
    console.error("❌ Erreur lors de la création:", error.message);
    process.exit(1);
  }

  console.log("✅ Utilisateur créé avec succès!\n");
  console.log("📧 Identifiants de connexion:");
  console.log(`   Email:    ${TEST_USER.email}`);
  console.log(`   Password: ${TEST_USER.password}`);
  console.log(`   User ID:  ${data.user?.id}`);
}

seedUser().catch(console.error);
