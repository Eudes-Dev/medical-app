/**
 * Classes d'erreurs personnalisées pour l'application
 *
 * Ce module contient les classes d'erreurs spécifiques utilisées
 * dans l'application pour faciliter le debugging et la gestion d'erreurs.
 *
 * @module lib/errors
 */

/**
 * Erreur levée lorsqu'un utilisateur non authentifié tente d'accéder
 * à une ressource protégée.
 *
 * Cette erreur doit être levée dans les Server Actions lorsque
 * l'utilisateur n'est pas authentifié, au lieu de retourner null
 * ou des données vides.
 *
 * @example
 * ```typescript
 * if (!user) {
 *   throw new UnauthorizedError('User must be authenticated to access this resource');
 * }
 * ```
 */
export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized: User must be authenticated") {
    super(message);
    this.name = "UnauthorizedError";
    // Maintient la stack trace pour le debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }
}
