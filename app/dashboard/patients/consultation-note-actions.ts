"use server";

/**
 * Server Actions pour les notes de consultation (story 9.1).
 *
 * Première brique de l'épopée 9 « Dossier patient » : historique clinique
 * structuré (entrées datées) rattaché à un patient, distinct du champ libre
 * unique `Patient.notes`.
 *
 * ⚠️ Ce fichier est un module `"use server"`, PAS une route : il ne doit jamais
 * être renommé `page.tsx`/`route.ts`.
 *
 * Sécurité (héritée 5.2) :
 *  - Toutes les actions passent par `requireUser()`.
 *  - Tout `id` est validé via `assertValidUuid()` avant tout appel Prisma.
 *  - Les inputs ne sont consommés que via Prisma paramétré + schémas Zod.
 *
 * @module app/dashboard/patients/consultation-note-actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import {
  consultationNoteSchema,
  type ConsultationNoteFormValues,
} from "@/lib/validations/consultation-notes";

/**
 * Représentation d'une note de consultation pour l'affichage.
 */
export type ConsultationNoteData = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Mappe une note Prisma vers le type d'affichage. */
function toConsultationNoteData(note: {
  id: string;
  patientId: string;
  appointmentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): ConsultationNoteData {
  return {
    id: note.id,
    patientId: note.patientId,
    appointmentId: note.appointmentId,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Récupère les notes de consultation d'un patient, de la plus récente à la
 * plus ancienne.
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getConsultationNotes(
  patientId: string
): Promise<ConsultationNoteData[]> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const notes = await prisma.consultationNote.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return notes.map(toConsultationNoteData);
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof BadRequestError) {
      console.error("[getConsultationNotes] Invalid UUID:", error.message);
      return [];
    }
    console.error("[getConsultationNotes] Error:", error);
    throw new Error(
      `Failed to fetch consultation notes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Crée une note de consultation pour un patient.
 */
export async function createConsultationNote(
  patientId: string,
  data: ConsultationNoteFormValues
): Promise<
  | { success: true; note: ConsultationNoteData }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const parsed = consultationNoteSchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        "[createConsultationNote] Validation error:",
        parsed.error.flatten()
      );
      return {
        success: false,
        error: "La note est invalide. Vérifiez le contenu saisi.",
      };
    }

    const note = await prisma.consultationNote.create({
      data: {
        patientId,
        content: parsed.data.content,
        appointmentId: parsed.data.appointmentId ?? null,
      },
    });

    revalidatePath(`/dashboard/patients/${patientId}`);

    return { success: true, note: toConsultationNoteData(note) };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour ajouter une note.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[createConsultationNote] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'ajout de la note. Veuillez réessayer.",
    };
  }
}

/**
 * Met à jour le contenu d'une note de consultation existante.
 */
export async function updateConsultationNote(
  noteId: string,
  data: ConsultationNoteFormValues
): Promise<
  | { success: true; note: ConsultationNoteData }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(noteId);

    const parsed = consultationNoteSchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        "[updateConsultationNote] Validation error:",
        parsed.error.flatten()
      );
      return {
        success: false,
        error: "La note est invalide. Vérifiez le contenu saisi.",
      };
    }

    const note = await prisma.consultationNote.update({
      where: { id: noteId },
      data: {
        content: parsed.data.content,
        appointmentId: parsed.data.appointmentId ?? null,
      },
    });

    revalidatePath(`/dashboard/patients/${note.patientId}`);

    return { success: true, note: toConsultationNoteData(note) };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour modifier une note.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de note invalide." };
    }
    console.error("[updateConsultationNote] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la mise à jour de la note. Veuillez réessayer.",
    };
  }
}

/**
 * Supprime une note de consultation.
 */
export async function deleteConsultationNote(
  noteId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireUser();
    assertValidUuid(noteId);

    const note = await prisma.consultationNote.delete({
      where: { id: noteId },
    });

    revalidatePath(`/dashboard/patients/${note.patientId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer une note.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de note invalide." };
    }
    console.error("[deleteConsultationNote] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la suppression de la note. Veuillez réessayer.",
    };
  }
}
