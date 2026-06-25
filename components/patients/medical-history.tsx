"use client";

/**
 * Section « Antécédents médicaux » de la fiche patient (story 9.3).
 *
 * Affiche le fond clinique structuré d'un patient, **regroupé par catégorie**
 * (Allergies, Traitements en cours, Antécédents chirurgicaux / familiaux,
 * Autres) ; à l'intérieur de chaque groupe, les entrées sont triées de la plus
 * récente à la plus ancienne. Permet d'ajouter / modifier (contenu + catégorie)
 * / supprimer une entrée. Les données initiales viennent du Server Component
 * parent ; l'état local reflète les mutations, puis `router.refresh()`
 * resynchronise avec le serveur.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMedicalHistoryEntry,
  updateMedicalHistoryEntry,
  deleteMedicalHistoryEntry,
  type MedicalHistoryEntryData,
} from "@/app/dashboard/patients/medical-history-actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  MEDICAL_HISTORY_CATEGORIES,
  MEDICAL_HISTORY_CATEGORY_LABELS,
  MEDICAL_HISTORY_CONTENT_MAX_LENGTH,
  type MedicalHistoryCategory,
} from "@/lib/validations/medical-history";

export type MedicalHistoryProps = {
  patientId: string;
  entries: MedicalHistoryEntryData[];
};

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

/** Valide le contenu localement (miroir de `medicalHistoryEntrySchema`). */
function validateContent(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "L'antécédent ne peut pas être vide";
  if (trimmed.length > MEDICAL_HISTORY_CONTENT_MAX_LENGTH)
    return `L'antécédent ne peut pas dépasser ${MEDICAL_HISTORY_CONTENT_MAX_LENGTH} caractères`;
  return null;
}

export function MedicalHistory({ patientId, entries }: MedicalHistoryProps) {
  const router = useRouter();

  const [currentEntries, setCurrentEntries] =
    React.useState<MedicalHistoryEntryData[]>(entries);
  const [newContent, setNewContent] = React.useState("");
  const [newCategory, setNewCategory] =
    React.useState<MedicalHistoryCategory>("ALLERGY");
  const [newError, setNewError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // État d'édition inline (contenu + catégorie).
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [editCategory, setEditCategory] =
    React.useState<MedicalHistoryCategory>("ALLERGY");
  const [editError, setEditError] = React.useState<string | null>(null);

  // Resynchronise l'état local si le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentEntries(entries);
  }, [entries]);

  const handleAdd = React.useCallback(async () => {
    const error = validateContent(newContent);
    if (error) {
      setNewError(error);
      return;
    }
    setNewError(null);
    setIsSubmitting(true);
    try {
      const result = await createMedicalHistoryEntry(patientId, {
        content: newContent,
        category: newCategory,
      });
      if (!result.success) {
        showError(result.error);
        return;
      }
      setCurrentEntries((prev) => [result.entry, ...prev]);
      setNewContent("");
      showSuccess(TOAST_MESSAGES.medicalHistory.created);
      router.refresh();
    } catch (err) {
      console.error("[MedicalHistory] create error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [newContent, newCategory, patientId, router]);

  const startEditing = React.useCallback((entry: MedicalHistoryEntryData) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
    setEditCategory(entry.category);
    setEditError(null);
  }, []);

  const cancelEditing = React.useCallback(() => {
    setEditingId(null);
    setEditContent("");
    setEditError(null);
  }, []);

  const handleUpdate = React.useCallback(
    async (entryId: string) => {
      const error = validateContent(editContent);
      if (error) {
        setEditError(error);
        return;
      }
      setEditError(null);
      setIsSubmitting(true);
      try {
        const result = await updateMedicalHistoryEntry(entryId, {
          content: editContent,
          category: editCategory,
        });
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentEntries((prev) =>
          prev.map((e) => (e.id === entryId ? result.entry : e))
        );
        cancelEditing();
        showSuccess(TOAST_MESSAGES.medicalHistory.updated);
        router.refresh();
      } catch (err) {
        console.error("[MedicalHistory] update error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editContent, editCategory, cancelEditing, router]
  );

  const handleDelete = React.useCallback(
    async (entryId: string) => {
      const confirmed = window.confirm(
        "Êtes-vous sûr de vouloir supprimer cet antécédent ? Cette action est définitive."
      );
      if (!confirmed) return;

      setIsSubmitting(true);
      try {
        const result = await deleteMedicalHistoryEntry(entryId);
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentEntries((prev) => prev.filter((e) => e.id !== entryId));
        showSuccess(TOAST_MESSAGES.medicalHistory.deleted);
        router.refresh();
      } catch (err) {
        console.error("[MedicalHistory] delete error:", err);
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
            <HeartPulse className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-base font-semibold">
              Antécédents médicaux
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulaire d'ajout */}
          <div className="space-y-2">
            <Select
              value={newCategory}
              onValueChange={(v) =>
                setNewCategory(v as MedicalHistoryCategory)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger
                className="w-full sm:w-64"
                aria-label="Catégorie de l'antécédent"
              >
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {MEDICAL_HISTORY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {MEDICAL_HISTORY_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Ajouter un antécédent médical…"
              aria-label="Nouvel antécédent médical"
              aria-invalid={newError ? true : undefined}
              disabled={isSubmitting}
              rows={3}
            />
            {newError ? (
              <p className="text-sm text-rose-500">{newError}</p>
            ) : null}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={isSubmitting}>
                Ajouter un antécédent
              </Button>
            </div>
          </div>

          {/* Liste groupée par catégorie */}
          {currentEntries.length > 0 ? (
            <div className="space-y-6">
              {MEDICAL_HISTORY_CATEGORIES.map((cat) => {
                const group = currentEntries.filter((e) => e.category === cat);
                if (group.length === 0) return null;
                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {MEDICAL_HISTORY_CATEGORY_LABELS[cat]}
                    </h3>
                    {group.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            {formatDateTime(entry.createdAt)}
                          </p>
                          {editingId !== entry.id ? (
                            <div className="flex items-center gap-1 text-slate-500">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                                aria-label="Modifier l'antécédent"
                                onClick={() => startEditing(entry)}
                                disabled={isSubmitting}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
                                aria-label="Supprimer l'antécédent"
                                onClick={() => handleDelete(entry.id)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {editingId === entry.id ? (
                          <div className="mt-2 space-y-2">
                            <Select
                              value={editCategory}
                              onValueChange={(v) =>
                                setEditCategory(v as MedicalHistoryCategory)
                              }
                              disabled={isSubmitting}
                            >
                              <SelectTrigger
                                className="w-full sm:w-64"
                                aria-label="Modifier la catégorie de l'antécédent"
                              >
                                <SelectValue placeholder="Catégorie" />
                              </SelectTrigger>
                              <SelectContent>
                                {MEDICAL_HISTORY_CATEGORIES.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {MEDICAL_HISTORY_CATEGORY_LABELS[c]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              aria-label="Modifier l'antécédent médical"
                              aria-invalid={editError ? true : undefined}
                              disabled={isSubmitting}
                              rows={3}
                            />
                            {editError ? (
                              <p className="text-sm text-rose-500">
                                {editError}
                              </p>
                            ) : null}
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={isSubmitting}
                              >
                                Annuler
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdate(entry.id)}
                                disabled={isSubmitting}
                              >
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                            {entry.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun antécédent médical pour ce patient.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
