/**
 * Construction de l'export RGPD des données d'un patient (story 11.2).
 *
 * Portabilité (art. 20 RGPD) : agrège l'identité du patient et toutes ses
 * données rattachées (rendez-vous, notes, antécédents, consentements, documents)
 * en un objet **normalisé, déterministe et sérialisable JSON**.
 *
 * Ce module est volontairement **pur** (aucun import Prisma/Supabase) afin d'être
 * testable en unit sans base. La Server Action `exportPatientData` se contente de
 * charger les données (Prisma) puis d'appeler `buildPatientExport`.
 *
 * ⚠️ Les documents médicaux sont exportés en **métadonnées uniquement** : le
 * chemin de stockage (`storagePath`) n'est JAMAIS inclus (cohérent avec 9.2 où le
 * chemin interne du bucket n'est jamais exposé au client).
 *
 * @module lib/rgpd/patient-export
 */

import { CONSENT_POLICY_VERSION } from "@/lib/validations/consent";

/** Version du schéma d'export (à incrémenter en cas de changement de forme). */
export const PATIENT_EXPORT_SCHEMA_VERSION = "1.0";

/* ------------------------------ Types d'entrée ----------------------------- */

/** Sous-ensemble des champs `Patient` repris dans l'export. */
export type PatientExportPatientInput = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: Date | null;
  notes: string | null;
  reminderOptOut: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientExportAppointmentInput = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  motif: string | null;
  modalite: string | null;
  lieu: string | null;
  notes: string | null;
  createdAt: Date;
};

export type PatientExportConsultationNoteInput = {
  id: string;
  appointmentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientExportMedicalHistoryInput = {
  id: string;
  category: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientExportConsentInput = {
  id: string;
  type: string;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  policyVersion: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Métadonnées d'un document médical. ⚠️ `storagePath` est volontairement absent
 * du type d'entrée : il ne doit jamais transiter dans l'export.
 */
export type PatientExportMedicalDocumentInput = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Données brutes (issues de Prisma) agrégées pour l'export. */
export type PatientExportInput = {
  patient: PatientExportPatientInput;
  appointments: PatientExportAppointmentInput[];
  consultationNotes: PatientExportConsultationNoteInput[];
  medicalHistoryEntries: PatientExportMedicalHistoryInput[];
  consentRecords: PatientExportConsentInput[];
  medicalDocuments: PatientExportMedicalDocumentInput[];
};

/* ------------------------------ Types de sortie ---------------------------- */

/** Objet d'export normalisé (toutes les `Date` sont des chaînes ISO 8601). */
export type PatientExport = {
  schemaVersion: string;
  exportedAt: string;
  policyVersion: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    dateOfBirth: string | null;
    notes: string | null;
    reminderOptOut: boolean;
    createdAt: string;
    updatedAt: string;
  };
  appointments: Array<{
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    type: string;
    motif: string | null;
    modalite: string | null;
    lieu: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  consultationNotes: Array<{
    id: string;
    appointmentId: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  medicalHistoryEntries: Array<{
    id: string;
    category: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  consentRecords: Array<{
    id: string;
    type: string;
    granted: boolean;
    grantedAt: string | null;
    revokedAt: string | null;
    policyVersion: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  medicalDocuments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type BuildPatientExportOptions = {
  /** Horodatage de l'export (défaut : `new Date()`). Injectable pour les tests. */
  now?: Date;
};

/* --------------------------------- Helpers --------------------------------- */

/** Sérialise une `Date` (ou null) en ISO 8601. */
function iso(date: Date | null): string | null {
  return date ? new Date(date).toISOString() : null;
}

/** Compare deux éléments par `createdAt` croissant (tri stable, déterministe). */
function byCreatedAt(a: { createdAt: Date }, b: { createdAt: Date }): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Translittération basique des accents FR courants vers ASCII (pour le nom de
 * fichier). Volontairement minimal : couvre les cas usuels des noms FR.
 */
function deburr(input: string): string {
  // Décompose puis retire les marques combinantes Unicode (U+0300–U+036F) via
  // une plage en échappements explicites (robuste / lint-safe).
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Produit un slug ASCII sûr (minuscule, `[a-z0-9-]`) à partir d'un libellé.
 * Anti-traversal : aucun `/`, `\`, `.` ni `..` ne peut subsister.
 */
function slugify(input: string): string {
  return deburr(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ----------------------------------- API ----------------------------------- */

/**
 * Construit l'objet d'export normalisé d'un patient.
 *
 * - Déterministe : les collections sont triées par `createdAt` croissant.
 * - Sérialisable : toutes les `Date` deviennent des chaînes ISO 8601.
 * - Sûr : les documents sont exportés sans `storagePath`.
 */
export function buildPatientExport(
  input: PatientExportInput,
  options: BuildPatientExportOptions = {}
): PatientExport {
  const now = options.now ?? new Date();
  const p = input.patient;

  return {
    schemaVersion: PATIENT_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    policyVersion: CONSENT_POLICY_VERSION,
    patient: {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email,
      dateOfBirth: iso(p.dateOfBirth),
      notes: p.notes,
      reminderOptOut: p.reminderOptOut,
      createdAt: new Date(p.createdAt).toISOString(),
      updatedAt: new Date(p.updatedAt).toISOString(),
    },
    appointments: [...input.appointments].sort(byCreatedAt).map((a) => ({
      id: a.id,
      startTime: new Date(a.startTime).toISOString(),
      endTime: new Date(a.endTime).toISOString(),
      status: a.status,
      type: a.type,
      motif: a.motif,
      modalite: a.modalite,
      lieu: a.lieu,
      notes: a.notes,
      createdAt: new Date(a.createdAt).toISOString(),
    })),
    consultationNotes: [...input.consultationNotes].sort(byCreatedAt).map((n) => ({
      id: n.id,
      appointmentId: n.appointmentId,
      content: n.content,
      createdAt: new Date(n.createdAt).toISOString(),
      updatedAt: new Date(n.updatedAt).toISOString(),
    })),
    medicalHistoryEntries: [...input.medicalHistoryEntries]
      .sort(byCreatedAt)
      .map((e) => ({
        id: e.id,
        category: e.category,
        content: e.content,
        createdAt: new Date(e.createdAt).toISOString(),
        updatedAt: new Date(e.updatedAt).toISOString(),
      })),
    consentRecords: [...input.consentRecords].sort(byCreatedAt).map((c) => ({
      id: c.id,
      type: c.type,
      granted: c.granted,
      grantedAt: iso(c.grantedAt),
      revokedAt: iso(c.revokedAt),
      policyVersion: c.policyVersion,
      note: c.note,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
    })),
    // ⚠️ Métadonnées seules — jamais de storagePath.
    medicalDocuments: [...input.medicalDocuments].sort(byCreatedAt).map((d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      category: d.category,
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    })),
  };
}

/**
 * Construit un nom de fichier d'export sûr.
 *
 * Forme : `donnees-patient-{nom}-{prenom}-{YYYY-MM-DD}.json`. Le slug est ASCII
 * minuscule ; aucun séparateur de chemin (`/`, `\`) ni `..` ne peut subsister
 * (anti-traversal). Si nom/prénom se réduisent à vide, on retombe sur `patient`.
 */
export function buildPatientExportFileName(
  patient: { firstName: string; lastName: string },
  now: Date = new Date()
): string {
  const namePart =
    slugify(`${patient.lastName}-${patient.firstName}`) || "patient";
  const datePart = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `donnees-patient-${namePart}-${datePart}.json`;
}
