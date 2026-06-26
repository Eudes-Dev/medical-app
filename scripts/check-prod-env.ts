/**
 * Vérification pré-déploiement des variables d'environnement de production (story 13.2).
 *
 * Aide-ops à exécuter AVANT un `vercel deploy` de production (ou dans le runbook
 * `docs/ops/13.2-deploiement-vercel.md`). Charge `.env` / `.env.local` puis valide la
 * présence des variables obligatoires via le module pur `lib/config/required-env`.
 *
 * - Ne lit ni ne modifie aucune base, n'émet aucun appel réseau.
 * - Sort en code 1 si des variables obligatoires manquent (ou sont vides), 0 sinon.
 * - N'est PAS branché sur `next build` : un preview sans secrets ne doit pas casser.
 *
 * Usage : `npm run check:prod-env`
 *
 * @module scripts/check-prod-env
 */
import * as dotenv from "dotenv";

import {
  ENV_VARS,
  REQUIRED_PRODUCTION_KEYS,
  validateProductionEnv,
} from "../lib/config/required-env";

// Charger les fichiers d'environnement locaux (mêmes priorités que prisma.config.ts).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const result = validateProductionEnv(process.env);

console.log("Vérification des variables d'environnement de production (story 13.2)\n");
console.log(`Obligatoires en production : ${REQUIRED_PRODUCTION_KEYS.length}`);

if (result.ok) {
  console.log("\n✅ Toutes les variables obligatoires sont renseignées.");
  process.exit(0);
}

const describe = (key: string): string =>
  ENV_VARS.find((v) => v.key === key)?.description ?? "";

if (result.missing.length > 0) {
  console.log(`\n❌ Manquantes (${result.missing.length}) :`);
  for (const key of result.missing) {
    console.log(`   - ${key} — ${describe(key)}`);
  }
}

if (result.empty.length > 0) {
  console.log(`\n⚠️  Présentes mais vides (${result.empty.length}) :`);
  for (const key of result.empty) {
    console.log(`   - ${key} — ${describe(key)}`);
  }
}

console.log(
  "\nRenseignez ces variables (cf. .env.example + docs/ops/13.2-deploiement-vercel.md) avant le déploiement.",
);
process.exit(1);
