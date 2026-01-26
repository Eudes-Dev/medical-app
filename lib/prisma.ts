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
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 *
 * @module lib/prisma
 */

import { PrismaClient } from "@/lib/generated/prisma";

/**
 * Extension de globalThis pour stocker l'instance Prisma.
 * Utilisé uniquement en développement pour persister l'instance entre les HMR.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

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
export const prisma = globalForPrisma.prisma || new PrismaClient();

// En développement, stocker l'instance dans globalThis pour éviter
// les connexions multiples lors du HMR
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Export par défaut pour flexibilité d'import.
 */
export default prisma;
