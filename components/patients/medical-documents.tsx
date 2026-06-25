"use client";

/**
 * Section « Documents médicaux » de la fiche patient (story 9.2).
 *
 * Liste les pièces du dossier (récent → ancien) et permet d'ajouter / télécharger
 * / supprimer un document. Conformément à l'ADR §5 stockage de fichiers :
 *  - la métadonnée est créée via Server Action (`createMedicalDocument`) qui
 *    renvoie une URL d'upload signée ;
 *  - le binaire est ensuite déposé par le **client navigateur** Supabase
 *    (`uploadToSignedUrl`) ;
 *  - le téléchargement passe par une URL de lecture signée courte.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Paperclip, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  createMedicalDocument,
  deleteMedicalDocument,
  getMedicalDocumentDownloadUrl,
  type MedicalDocumentData,
} from "@/app/dashboard/patients/medical-document-actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  MEDICAL_DOCUMENT_ALLOWED_MIME,
  MEDICAL_DOCUMENT_CATEGORIES,
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
  MEDICAL_DOCUMENT_MAX_SIZE_BYTES,
  type MedicalDocumentCategoryValue,
  type MedicalDocumentMime,
} from "@/lib/validations/medical-documents";

export type MedicalDocumentsProps = {
  patientId: string;
  documents: MedicalDocumentData[];
};

/** Liste des MIME autorisés (pour l'attribut `accept` et la validation client). */
const ALLOWED_MIME = Object.keys(
  MEDICAL_DOCUMENT_ALLOWED_MIME
) as MedicalDocumentMime[];

/** Formate une date/heure en français (ex. « 25/06/2026 14:30 »). */
function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formate une taille en octets en Ko/Mo lisibles. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} Ko`;
  return `${(kb / 1024).toFixed(1)} Mo`;
}

/** Valide un fichier localement (miroir de `medicalDocumentSchema`). */
function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type as MedicalDocumentMime)) {
    return "Type de fichier non autorisé (PDF, JPEG ou PNG attendu).";
  }
  if (file.size <= 0) return "Le fichier est vide.";
  if (file.size > MEDICAL_DOCUMENT_MAX_SIZE_BYTES) {
    return "Le fichier dépasse la taille maximale autorisée (10 Mo).";
  }
  return null;
}

export function MedicalDocuments({ patientId, documents }: MedicalDocumentsProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [currentDocs, setCurrentDocs] =
    React.useState<MedicalDocumentData[]>(documents);
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] =
    React.useState<MedicalDocumentCategoryValue>("OTHER");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Resynchronise l'état local quand le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentDocs(documents);
  }, [documents]);

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null;
      setError(selected ? validateFile(selected) : null);
      setFile(selected);
    },
    []
  );

  const resetForm = React.useCallback(() => {
    setFile(null);
    setError(null);
    setCategory("OTHER");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleAdd = React.useCallback(async () => {
    if (!file) {
      setError("Sélectionnez un fichier à ajouter.");
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createMedicalDocument(patientId, {
        fileName: file.name,
        mimeType: file.type as MedicalDocumentMime,
        sizeBytes: file.size,
        category,
      });
      if (!result.success) {
        showError(result.error);
        return;
      }

      // Upload du binaire vers l'URL signée (client navigateur Supabase).
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(result.upload.bucket)
        .uploadToSignedUrl(result.upload.path, result.upload.token, file);

      if (uploadError) {
        // Rollback de la ligne de métadonnées orpheline.
        await deleteMedicalDocument(result.document.id);
        showError(TOAST_MESSAGES.medicalDocument.uploadFailed);
        return;
      }

      setCurrentDocs((prev) => [result.document, ...prev]);
      resetForm();
      showSuccess(TOAST_MESSAGES.medicalDocument.added);
      router.refresh();
    } catch (err) {
      console.error("[MedicalDocuments] add error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [file, category, patientId, resetForm, router]);

  const handleDownload = React.useCallback(async (documentId: string) => {
    try {
      const result = await getMedicalDocumentDownloadUrl(documentId);
      if (!result.success) {
        showError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[MedicalDocuments] download error:", err);
      showError(TOAST_MESSAGES.errors.server);
    }
  }, []);

  const handleDelete = React.useCallback(
    async (documentId: string) => {
      const confirmed = window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce document ? Cette action est définitive."
      );
      if (!confirmed) return;

      setIsSubmitting(true);
      try {
        const result = await deleteMedicalDocument(documentId);
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentDocs((prev) => prev.filter((d) => d.id !== documentId));
        showSuccess(TOAST_MESSAGES.medicalDocument.deleted);
        router.refresh();
      } catch (err) {
        console.error("[MedicalDocuments] delete error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router]
  );

  return (
    <section className="w-full">
      <Card className="border border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-base font-semibold">
              Documents médicaux
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulaire d'ajout */}
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MIME.join(",")}
                onChange={handleFileChange}
                aria-label="Sélectionner un document à ajouter"
                disabled={isSubmitting}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
              />
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as MedicalDocumentCategoryValue)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger
                  className="w-full sm:w-48"
                  aria-label="Catégorie du document"
                >
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {MEDICAL_DOCUMENT_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isSubmitting || !file}
              >
                Ajouter un document
              </Button>
            </div>
          </div>

          {/* Liste des documents */}
          {currentDocs.length > 0 ? (
            <div className="space-y-3">
              {currentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {doc.fileName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                          {MEDICAL_DOCUMENT_CATEGORY_LABELS[doc.category]}
                        </span>
                        <span>{formatBytes(doc.sizeBytes)}</span>
                        <span>·</span>
                        <span>{formatDateTime(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-slate-500">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                      aria-label={`Télécharger ${doc.fileName}`}
                      onClick={() => handleDownload(doc.id)}
                      disabled={isSubmitting}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
                      aria-label={`Supprimer ${doc.fileName}`}
                      onClick={() => handleDelete(doc.id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun document médical pour ce patient.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
