/**
 * Validation des identifiants UUID (Story 5.2).
 *
 * Centralise la vérification du format UUID en tête des Server Actions qui
 * acceptent un `id` utilisateur, en complément des contraintes Prisma.
 *
 * @module lib/validations/uuid
 */

import { z } from "zod";
import { BadRequestError } from "@/lib/errors";

/** Schéma Zod d'un UUID (toute version). */
export const uuidSchema = z.string().uuid();

/**
 * Vérifie qu'un `id` est un UUID valide ; lève `BadRequestError` sinon.
 *
 * Ne renvoie pas l'`id` complet dans le message d'erreur (préfixe tronqué)
 * pour éviter toute fuite involontaire dans les logs.
 */
export function assertValidUuid(id: string): void {
  if (!uuidSchema.safeParse(id).success) {
    const preview = typeof id === "string" ? id.slice(0, 8) : "";
    throw new BadRequestError(`Invalid UUID: ${preview}…`);
  }
}
