/**
 * Configuration Prisma pour l'application médicale.
 *
 * Ce fichier configure les chemins et la connexion à la base de données.
 * Depuis Prisma 7, toutes les URLs de connexion sont définies ici.
 *
 * Variables d'environnement requises:
 * - DATABASE_URL: URL de connexion avec pooler PgBouncer (requêtes applicatives)
 * - DIRECT_URL: URL de connexion directe sans pooler (migrations Prisma)
 *
 * Note: DIRECT_URL est essentiel pour Supabase car les migrations utilisent
 * des commandes DDL qui ne sont pas compatibles avec le pooler PgBouncer.
 *
 * @see https://www.prisma.io/docs/guides/database/supabase
 * @see https://pris.ly/d/config-datasource
 */
import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Charger les variables d'environnement depuis .env.local (priorité Next.js)
// puis .env comme fallback
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  // Chemin vers le fichier de schéma Prisma
  schema: "prisma/schema.prisma",

  // Configuration des migrations
  migrations: {
    path: "prisma/migrations",
  },

  // Configuration de la source de données (Prisma 7+)
  // - url: Utilisé par le CLI Prisma pour les migrations
  // - directUrl: Connexion directe pour contourner le pooler lors des DDL
  datasource: {
    // URL principale pour les migrations (utilise DIRECT_URL pour éviter le pooler)
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
