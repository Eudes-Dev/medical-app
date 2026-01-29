/**
 * Instance singleton du client Prisma.
 *
 * Ce fichier gère la création et le cache du client Prisma pour éviter
 * de créer plusieurs instances lors du développement avec Hot Module Replacement (HMR).
 *
 * En développement, Next.js réimporte les modules à chaque modification,
 * ce qui créerait une nouvelle instance Prisma à chaque fois.
 * Cette approche singleton stocke l'instance dans globalThis pour la réutiliser.
 *
 * En production, une seule instance est créée normalement.
 *
 * Prisma 7 nécessite un adaptateur ou une URL Accelerate.
 * Nous utilisons l'adaptateur PostgreSQL (@prisma/adapter-pg) pour une connexion standard.
 *
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 * @see https://www.prisma.io/docs/orm/overview/databases/postgresql
 *
 * @module lib/prisma
 */

import { PrismaClient } from "@/lib/generated/prisma/client";
import type { PrismaClient as PrismaClientType } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Extension de globalThis pour stocker l'instance Prisma.
 * Utilisé uniquement en développement pour persister l'instance entre les HMR.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType };

/**
 * Crée une nouvelle instance PrismaClient avec l'adaptateur PostgreSQL.
 *
 * Prisma 7 nécessite soit un adaptateur, soit une URL Accelerate.
 * Pour une connexion PostgreSQL standard avec Supabase, nous utilisons l'adaptateur @prisma/adapter-pg.
 * 
 * L'adaptateur utilise le driver node-postgres (pg) sous le capot pour se connecter à PostgreSQL.
 * 
 * Note: La configuration de la datasource est également définie dans prisma.config.ts
 * pour les migrations, mais le client runtime nécessite l'adaptateur ou l'URL explicitement.
 */
function createPrismaClient(): PrismaClientType {
  // Récupérer l'URL de connexion depuis les variables d'environnement
  // Utiliser DATABASE_URL pour les requêtes applicatives (avec pooler PgBouncer)
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL n'est pas définie dans les variables d'environnement. " +
      "Veuillez vérifier votre fichier .env.local"
    );
  }

  // Créer l'adaptateur PostgreSQL avec l'URL de connexion
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  // Créer le client Prisma avec l'adaptateur
  return new PrismaClient({ adapter });
}

/**
 * Instance singleton du client Prisma.
 *
 * - En développement: réutilise l'instance existante dans globalThis
 * - En production: crée une nouvelle instance
 *
 * @example
 * import { prisma } from "@/lib/prisma";
 *
 * // Récupérer tous les patients
 * const patients = await prisma.patient.findMany();
 *
 * // Créer un nouveau rendez-vous
 * const appointment = await prisma.appointment.create({
 *   data: { ... }
 * });
 */
export const prisma = globalForPrisma.prisma || createPrismaClient();

// En développement, stocker l'instance dans globalThis pour éviter
// les connexions multiples lors du HMR
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Export par défaut pour flexibilité d'import.
 */
export default prisma;
