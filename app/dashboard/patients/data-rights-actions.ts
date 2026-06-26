"use server";

/**
 * Server Actions des droits RGPD du patient (story 11.2).
 *
 * Deuxième brique « droits du patient » de l'épopée 11 « RGPD / Sécurité » :
 *  - `exportPatientData` : **portabilité (art. 20)** — agrège l'intégralité des
 *    données du patient en un JSON structuré (lecture seule, aucune écriture, pas
 *    de téléchargement de binaire — documents en métadonnées seules) ;
 *  - `erasePatientData` : **droit à l'effacement / droit à l'oubli (art. 17)** —
 *    purge les objets Storage des documents PUIS supprime le patient (cascade FK
 *    sur RDV, notes, antécédents, documents, consentements, liste d'attente).
 *
 * ⚠️ Module `"use server"`, PAS une route : ne jamais renommer `page.tsx`/`route.ts`.
 *
 * Sécurité (héritée 5.2) :
 *  - toutes les actions passent par `requireUser()` ;
 *  - tout `id` est validé via `assertValidUuid()` avant tout appel Prisma/Storage ;
 *  - Prisma paramétré ; aucune surface publique ; le nom de fichier d'export est
 *    un slug dérivé (anti-traversal).
 *
 * Comble la lacune de `deletePatient` (actions.ts) : la cascade SQL ne supprime
 * pas les objets binaires du bucket Supabase Storage — ici on les purge d'abord.
 *
 * @module app/dashboard/patients/data-rights-actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import { removeObjects } from "@/lib/storage/medical-documents";
import {
  buildPatientExport,
  buildPatientExportFileName,
} from "@/lib/rgpd/patient-export";

/**
 * Exporte l'intégralité des données d'un patient au format JSON structuré
 * (portabilité — art. 20 RGPD).
 *
 * @returns Le nom de fichier sûr et la chaîne JSON indentée, ou une erreur FR.
 */
export async function exportPatientData(
  patientId: string
): Promise<
  | { success: true; fileName: string; json: string }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: true,
        consultationNotes: true,
        medicalHistoryEntries: true,
        consentRecords: true,
        medicalDocuments: true,
      },
    });

    if (!patient) {
      return { success: false, error: "Patient introuvable." };
    }

    const exportObject = buildPatientExport({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        notes: patient.notes,
        reminderOptOut: patient.reminderOptOut,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      appointments: patient.appointments.map((a) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        type: a.type,
        motif: a.motif,
        modalite: a.modalite,
        lieu: a.lieu,
        notes: a.notes,
        createdAt: a.createdAt,
      })),
      consultationNotes: patient.consultationNotes.map((n) => ({
        id: n.id,
        appointmentId: n.appointmentId,
        content: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      medicalHistoryEntries: patient.medicalHistoryEntries.map((e) => ({
        id: e.id,
        category: e.category,
        content: e.content,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      consentRecords: patient.consentRecords.map((c) => ({
        id: c.id,
        type: c.type,
        granted: c.granted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
        policyVersion: c.policyVersion,
        note: c.note,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      // ⚠️ storagePath volontairement non transmis (métadonnées seules).
      medicalDocuments: patient.medicalDocuments.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        category: d.category,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });

    return {
      success: true,
      fileName: buildPatientExportFileName({
        firstName: patient.firstName,
        lastName: patient.lastName,
      }),
      json: JSON.stringify(exportObject, null, 2),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour exporter les données.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[exportPatientData] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'export des données. Veuillez réessayer.",
    };
  }
}

/**
 * Efface définitivement un patient et toutes ses données (droit à l'oubli —
 * art. 17 RGPD) : purge des objets Storage des documents (best-effort) puis
 * suppression du patient (cascade FK sur toutes les lignes liées).
 *
 * @returns Le nombre de documents purgés, ou une erreur FR.
 */
export async function erasePatientData(
  patientId: string
): Promise<
  | { success: true; erasedDocuments: number }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    // 1. Récupère les chemins de stockage des documents du patient.
    const documents = await prisma.medicalDocument.findMany({
      where: { patientId },
      select: { storagePath: true },
    });
    const paths = documents.map((d) => d.storagePath);

    // 2. Purge best-effort des binaires Storage : un échec ne doit pas rendre le
    //    patient « non supprimable » (même politique que deleteMedicalDocument).
    //    La trace de l'échec partiel relèvera du journal d'audit (11.3).
    try {
      await removeObjects(paths);
    } catch (storageError) {
      console.error(
        "[erasePatientData] Storage removal failed (continuing):",
        storageError
      );
    }

    // 3. Supprime le patient → cascade FK sur RDV, notes, documents, antécédents,
    //    consentements, entrées de liste d'attente.
    await prisma.patient.delete({ where: { id: patientId } });

    revalidatePath("/dashboard/patients");

    return { success: true, erasedDocuments: paths.length };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer un patient.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[erasePatientData] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la suppression du patient. Veuillez réessayer.",
    };
  }
}
