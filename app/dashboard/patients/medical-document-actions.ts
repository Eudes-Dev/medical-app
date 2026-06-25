"use server";

/**
 * Server Actions pour les documents médicaux (story 9.2).
 *
 * Deuxième brique de l'épopée 9 « Dossier patient » : pièces du dossier
 * (ordonnances, comptes rendus, imagerie, analyses…) rattachées à un patient.
 *
 * Architecture (ADR §5 stockage de fichiers) :
 *  - le **binaire** vit dans un bucket Supabase Storage privé ;
 *  - seules les **métadonnées** sont persistées via Prisma ;
 *  - accès par **URL signées courtes** ; aucune URL publique.
 *
 * ⚠️ Module `"use server"`, PAS une route : ne jamais renommer `page.tsx`/`route.ts`.
 *
 * Sécurité (héritée 5.2) :
 *  - toutes les actions passent par `requireUser()` ;
 *  - tout `id` est validé via `assertValidUuid()` avant tout appel Prisma/Storage ;
 *  - les inputs sont validés par Zod ; Prisma paramétré ; chemin de stockage
 *    dérivé du mime (anti-traversal).
 *
 * @module app/dashboard/patients/medical-document-actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import {
  medicalDocumentSchema,
  buildMedicalDocumentPath,
  type MedicalDocumentFormValues,
  type MedicalDocumentCategoryValue,
} from "@/lib/validations/medical-documents";
import {
  MEDICAL_DOCS_BUCKET,
  createUploadUrl,
  createDownloadUrl,
  removeObject,
} from "@/lib/storage/medical-documents";

/**
 * Représentation d'un document médical pour l'affichage.
 *
 * ⚠️ `storagePath` est volontairement **omis** : le chemin interne du bucket
 * n'est jamais exposé au client (téléchargement via URL signée dédiée).
 */
export type MedicalDocumentData = {
  id: string;
  patientId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: MedicalDocumentCategoryValue;
  createdAt: Date;
  updatedAt: Date;
};

/** Métadonnées Prisma brutes (avec `storagePath`, usage interne). */
type MedicalDocumentRow = MedicalDocumentData & { storagePath: string };

/** Mappe une ligne Prisma vers le type d'affichage (sans `storagePath`). */
function toMedicalDocumentData(row: MedicalDocumentRow): MedicalDocumentData {
  return {
    id: row.id,
    patientId: row.patientId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    category: row.category,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Récupère les documents d'un patient, du plus récent au plus ancien.
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getMedicalDocuments(
  patientId: string
): Promise<MedicalDocumentData[]> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const rows = await prisma.medicalDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => toMedicalDocumentData(row as MedicalDocumentRow));
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof BadRequestError) {
      console.error("[getMedicalDocuments] Invalid UUID:", error.message);
      return [];
    }
    console.error("[getMedicalDocuments] Error:", error);
    throw new Error(
      `Failed to fetch medical documents: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/** Forme de retour d'upload renvoyée au client. */
export type MedicalDocumentUpload = {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
};

/**
 * Crée la métadonnée d'un document et l'URL d'upload signée associée.
 *
 * Le client doit ensuite déposer le binaire vers `upload.signedUrl`
 * (`uploadToSignedUrl`). En cas d'échec d'upload, appeler
 * `deleteMedicalDocument(document.id)` pour annuler la ligne.
 */
export async function createMedicalDocument(
  patientId: string,
  meta: MedicalDocumentFormValues
): Promise<
  | { success: true; document: MedicalDocumentData; upload: MedicalDocumentUpload }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const parsed = medicalDocumentSchema.safeParse(meta);
    if (!parsed.success) {
      console.error(
        "[createMedicalDocument] Validation error:",
        parsed.error.flatten()
      );
      return {
        success: false,
        error: "Le document est invalide (type, taille ou nom de fichier).",
      };
    }

    const path = buildMedicalDocumentPath(patientId, parsed.data.mimeType);
    const upload = await createUploadUrl(path);

    const row = await prisma.medicalDocument.create({
      data: {
        patientId,
        storagePath: path,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
        category: parsed.data.category,
      },
    });

    revalidatePath(`/dashboard/patients/${patientId}`);

    return {
      success: true,
      document: toMedicalDocumentData(row as MedicalDocumentRow),
      upload: {
        bucket: MEDICAL_DOCS_BUCKET,
        path,
        token: upload.token,
        signedUrl: upload.signedUrl,
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour ajouter un document.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[createMedicalDocument] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'ajout du document. Veuillez réessayer.",
    };
  }
}

/**
 * Génère une URL de lecture signée courte pour télécharger un document.
 */
export async function getMedicalDocumentDownloadUrl(
  documentId: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    await requireUser();
    assertValidUuid(documentId);

    const row = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });
    if (!row) {
      return { success: false, error: "Document introuvable." };
    }

    const url = await createDownloadUrl((row as MedicalDocumentRow).storagePath);
    return { success: true, url };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour télécharger un document.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de document invalide." };
    }
    console.error("[getMedicalDocumentDownloadUrl] Error:", error);
    return {
      success: false,
      error: "Impossible de générer le lien de téléchargement. Veuillez réessayer.",
    };
  }
}

/**
 * Supprime un document : objet Storage (best-effort) puis ligne de métadonnées.
 */
export async function deleteMedicalDocument(
  documentId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireUser();
    assertValidUuid(documentId);

    const row = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });
    if (!row) {
      return { success: false, error: "Document introuvable." };
    }

    // Best-effort : on tente de purger l'objet, mais on supprime la ligne même
    // si l'objet a déjà disparu (évite une ligne fantôme bloquante).
    try {
      await removeObject((row as MedicalDocumentRow).storagePath);
    } catch (storageError) {
      console.error(
        "[deleteMedicalDocument] Storage removal failed (continuing):",
        storageError
      );
    }

    await prisma.medicalDocument.delete({ where: { id: documentId } });

    revalidatePath(`/dashboard/patients/${(row as MedicalDocumentRow).patientId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer un document.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de document invalide." };
    }
    console.error("[deleteMedicalDocument] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la suppression du document. Veuillez réessayer.",
    };
  }
}
