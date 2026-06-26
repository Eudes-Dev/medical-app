/**
 * Libellés et helpers purs du journal d'audit RGPD (story 11.3).
 *
 * Troisième brique de l'épopée 11 « RGPD / Sécurité ». Ce module est volontairement
 * **pur** (aucun import Prisma/Supabase) afin d'être testable en unit sans base :
 *  - `AUDIT_ACTION_LABELS` : libellé FR court de chaque action consignée ;
 *  - `AUDIT_LABELS` : libellés de l'UI (titre/intro/en-têtes/état vide) ;
 *  - `formatPatientLabel` : snapshot lisible du nom du patient (sûr, compact).
 *
 * La couche d'écriture (`@/lib/server/audit`) et la lecture
 * (`app/dashboard/audit/actions`) réutilisent ces libellés.
 *
 * @module lib/rgpd/audit
 */

/**
 * Type d'action consignée. Union de chaînes alignée sur l'enum Prisma
 * `AuditAction` (gardé découplé du client généré pour rester pur/testable).
 */
export type AuditActionType =
  | "PATIENT_EXPORT"
  | "PATIENT_ERASURE"
  | "CONSENT_GRANTED"
  | "CONSENT_REVOKED"
  | "CONSENT_RESET";

/** Libellés FR courts par action (couvre toutes les valeurs de l'enum). */
export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  PATIENT_EXPORT: "Export des données",
  PATIENT_ERASURE: "Effacement définitif",
  CONSENT_GRANTED: "Consentement accordé",
  CONSENT_REVOKED: "Consentement retiré",
  CONSENT_RESET: "Consentement réinitialisé",
};

/**
 * Actions « sensibles » dont l'affichage mérite une pastille « danger » (rouge)
 * dans le journal (effacement). Les autres sont neutres.
 */
export const AUDIT_DANGER_ACTIONS: ReadonlySet<AuditActionType> = new Set([
  "PATIENT_ERASURE",
]);

/** Libellés de l'interface de la page « Journal d'audit ». */
export const AUDIT_LABELS = {
  pageTitle: "Journal d'audit",
  intro:
    "Trace en lecture seule des opérations sensibles réalisées sur les données patient (export, effacement, consentement). Cette piste d'audit est immuable et conservée même après la suppression d'un patient.",
  columns: {
    action: "Action",
    patient: "Patient",
    actor: "Acteur",
    summary: "Détail",
    date: "Date",
  },
  empty: "Aucun événement d'audit pour le moment.",
  unknownPatient: "—",
} as const;

/**
 * Construit un libellé patient compact et sûr à partir de son identité.
 *
 * Utilisé comme **snapshot** figé au moment de l'action : reste lisible même
 * après l'effacement du patient. Replie sur `"Patient"` si le nom est vide.
 */
export function formatPatientLabel(input: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const label = `${input.firstName ?? ""} ${input.lastName ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
  return label.length > 0 ? label : "Patient";
}
