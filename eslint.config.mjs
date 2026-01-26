/**
 * Configuration ESLint pour l'application médicale Next.js 16.
 *
 * Cette configuration utilise le nouveau format ESLint Flat Config (v9+)
 * avec les règles recommandées de Next.js pour:
 * - Core Web Vitals (performances et accessibilité)
 * - TypeScript (typage strict)
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/eslint
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Règles Next.js Core Web Vitals (performances + accessibilité)
  ...nextVitals,

  // Règles TypeScript strictes
  ...nextTs,

  // Fichiers et dossiers à ignorer
  globalIgnores([
    // Dossiers de build Next.js
    ".next/**",
    "out/**",
    "build/**",

    // Fichiers générés
    "next-env.d.ts",

    // Dossiers de documentation et configuration BMAD
    ".bmad-core/**",
    "docs/**",
    "web-bundles/**",

    // Dossiers de dépendances
    "node_modules/**",
  ]),

  // Règles personnalisées pour le projet
  {
    /**
     * Règles supplémentaires pour garantir la qualité du code.
     * Ces règles s'appliquent à tous les fichiers TypeScript/JavaScript.
     */
    rules: {
      // Éviter les console.log en production (warning pour le dev)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Préférer const quand la variable n'est pas réassignée
      "prefer-const": "error",

      // Interdire les variables inutilisées (sauf préfixées par _)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Garantir l'utilisation cohérente des types
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
]);

export default eslintConfig;
