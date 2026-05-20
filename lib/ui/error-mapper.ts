/**
 * Mapping unique code d'erreur Server Action → message utilisateur FR.
 *
 * Centralise l'AC 6 / AC 16 de la story 5.1 : aucun composant client ne doit
 * exposer un détail technique (Prisma, Postgres, stack). Toute Server Action
 * qui renvoie `{ error: "CODE" }` passe par ce helper pour obtenir un message
 * neutre.
 */

import { TOAST_MESSAGES } from "./toast-messages";

export type ServerErrorCode =
  | "VALIDATION"
  | "SLOT_TAKEN"
  | "SERVER"
  | "UNAUTHORIZED"
  | "BAD_REQUEST";

export interface ServerError {
  error?: ServerErrorCode | string;
}

export function mapServerErrorToMessage(result: ServerError): string {
  switch (result.error) {
    case "VALIDATION":
      return TOAST_MESSAGES.errors.validation;
    case "SLOT_TAKEN":
      return TOAST_MESSAGES.errors.slotTaken;
    case "UNAUTHORIZED":
      return TOAST_MESSAGES.errors.unauthorized;
    case "BAD_REQUEST":
      return TOAST_MESSAGES.errors.badRequest;
    case "SERVER":
    default:
      return TOAST_MESSAGES.errors.server;
  }
}
