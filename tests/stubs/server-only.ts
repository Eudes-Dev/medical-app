/**
 * Stub de test pour le marqueur `server-only` (story 10.1).
 *
 * Le paquet `server-only` est fourni par le runtime Next.js (pas présent dans
 * `node_modules`), si bien que Vite/Vitest ne sait pas le résoudre. Cet alias
 * (voir `vitest.config.ts`) le neutralise pour permettre d'importer en test les
 * modules d'accès `server-only` (ex. `app/dashboard/analytics/analytics-data.ts`).
 *
 * En production, l'import réel garantit toujours qu'un module serveur ne fuite
 * pas vers le bundle client.
 */

export {};
