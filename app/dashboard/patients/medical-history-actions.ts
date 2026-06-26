"use server";

/**
 * Server Actions pour les antécédents médicaux (story 9.3).
 *
 * Troisième brique de l'épopée 9 « Dossier patient » : fond clinique structuré
 * et catégorisé (allergies, traitements en cours, antécédents chirurgicaux /
 * familiaux), distinct de l'historique daté des consultations (`ConsultationNote`,
 * 9.1), des pièces jointes (`MedicalDocument`, 9.2) et du champ administratif
 * libre `Patient.notes` (conservé tel quel).
 *
 * ⚠️ Ce fichier est un module `"use server"`, PAS une route : il ne doit jamais
 * être renommé `page.tsx`/`route.ts`.
 *
 * Sécurité (héritée 5.2) :
 *  - Toutes les actions passent par `requireUser()`.
 *  - Tout `id` est validé via `assertValidUuid()` avant tout appel Prisma.
 *  - Les inputs ne sont consommés que via Prisma paramétré + schémas Zod.
 *
 * @module app/dashboard/patients/medical-history-actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import { encryptField, decryptField } from "@/lib/security/crypto";
import {
  medicalHistoryEntrySchema,
  type MedicalHistoryCategory,
  type MedicalHistoryEntryFormValues,
} from "@/lib/validations/medical-history";

/**
 * Représentation d'un antécédent médical pour l'affichage.
 */
export type MedicalHistoryEntryData = {
  id: string;
  patientId: string;
  category: MedicalHistoryCategory;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Mappe un antécédent Prisma vers le type d'affichage. */
function toMedicalHistoryEntryData(entry: {
  id: string;
  patientId: string;
  category: MedicalHistoryCategory;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): MedicalHistoryEntryData {
  return {
    id: entry.id,
    patientId: entry.patientId,
    category: entry.category,
    // Déchiffrement au repos (story 11.4) : l'appelant reçoit du clair. Les
    // lignes legacy en clair sont renvoyées telles quelles (lecture tolérante).
    content: decryptField(entry.content),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/**
 * Récupère les antécédents médicaux d'un patient, du plus récent au plus ancien.
 * Le regroupement par catégorie est effectué côté UI.
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getMedicalHistoryEntries(
  patientId: string
): Promise<MedicalHistoryEntryData[]> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const entries = await prisma.medicalHistoryEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return entries.map(toMedicalHistoryEntryData);
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof BadRequestError) {
      console.error("[getMedicalHistoryEntries] Invalid UUID:", error.message);
      return [];
    }
    console.error("[getMedicalHistoryEntries] Error:", error);
    throw new Error(
      `Failed to fetch medical history entries: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Crée un antécédent médical pour un patient.
 */
export async function createMedicalHistoryEntry(
  patientId: string,
  data: MedicalHistoryEntryFormValues
): Promise<
  | { success: true; entry: MedicalHistoryEntryData }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const parsed = medicalHistoryEntrySchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        "[createMedicalHistoryEntry] Validation error:",
        parsed.error.flatten()
      );
      return {
        success: false,
        error: "L'antécédent est invalide. Vérifiez les informations saisies.",
      };
    }

    const entry = await prisma.medicalHistoryEntry.create({
      data: {
        patientId,
        category: parsed.data.category,
        // Chiffrement applicatif au repos (story 11.4) sur le clair validé.
        content: encryptField(parsed.data.content),
      },
    });

    revalidatePath(`/dashboard/patients/${patientId}`);

    return { success: true, entry: toMedicalHistoryEntryData(entry) };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour ajouter un antécédent.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[createMedicalHistoryEntry] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'ajout de l'antécédent. Veuillez réessayer.",
    };
  }
}

/**
 * Met à jour un antécédent médical existant (contenu + catégorie).
 */
export async function updateMedicalHistoryEntry(
  entryId: string,
  data: MedicalHistoryEntryFormValues
): Promise<
  | { success: true; entry: MedicalHistoryEntryData }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(entryId);

    const parsed = medicalHistoryEntrySchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        "[updateMedicalHistoryEntry] Validation error:",
        parsed.error.flatten()
      );
      return {
        success: false,
        error: "L'antécédent est invalide. Vérifiez les informations saisies.",
      };
    }

    const entry = await prisma.medicalHistoryEntry.update({
      where: { id: entryId },
      data: {
        category: parsed.data.category,
        // Chiffrement applicatif au repos (story 11.4) sur le clair validé.
        content: encryptField(parsed.data.content),
      },
    });

    revalidatePath(`/dashboard/patients/${entry.patientId}`);

    return { success: true, entry: toMedicalHistoryEntryData(entry) };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour modifier un antécédent.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant d'antécédent invalide." };
    }
    console.error("[updateMedicalHistoryEntry] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la mise à jour de l'antécédent. Veuillez réessayer.",
    };
  }
}

/**
 * Supprime un antécédent médical.
 */
export async function deleteMedicalHistoryEntry(
  entryId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireUser();
    assertValidUuid(entryId);

    const entry = await prisma.medicalHistoryEntry.delete({
      where: { id: entryId },
    });

    revalidatePath(`/dashboard/patients/${entry.patientId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer un antécédent.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant d'antécédent invalide." };
    }
    console.error("[deleteMedicalHistoryEntry] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la suppression de l'antécédent. Veuillez réessayer.",
    };
  }
}
