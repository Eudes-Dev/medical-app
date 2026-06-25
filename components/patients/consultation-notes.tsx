"use client";

/**
 * Section « Notes de consultation » de la fiche patient (story 9.1).
 *
 * Affiche l'historique clinique structuré d'un patient (entrées datées, de la
 * plus récente à la plus ancienne) et permet d'ajouter / modifier / supprimer
 * une note. Les données initiales sont fournies par le Server Component parent ;
 * l'état local reflète les mutations sans rechargement complet (puis
 * `router.refresh()` resynchronise avec le serveur).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, NotebookPen, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
  type ConsultationNoteData,
} from "@/app/dashboard/patients/consultation-note-actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import { CONSULTATION_NOTE_MAX_LENGTH } from "@/lib/validations/consultation-notes";

export type ConsultationNotesProps = {
  patientId: string;
  notes: ConsultationNoteData[];
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

/** Valide le contenu localement (miroir de `consultationNoteSchema`). */
function validateContent(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "La note ne peut pas être vide";
  if (trimmed.length > CONSULTATION_NOTE_MAX_LENGTH)
    return `La note ne peut pas dépasser ${CONSULTATION_NOTE_MAX_LENGTH} caractères`;
  return null;
}

export function ConsultationNotes({ patientId, notes }: ConsultationNotesProps) {
  const router = useRouter();

  const [currentNotes, setCurrentNotes] =
    React.useState<ConsultationNoteData[]>(notes);
  const [newContent, setNewContent] = React.useState("");
  const [newError, setNewError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // État d'édition inline.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);

  // Resynchronise l'état local si le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentNotes(notes);
  }, [notes]);

  const handleAdd = React.useCallback(async () => {
    const error = validateContent(newContent);
    if (error) {
      setNewError(error);
      return;
    }
    setNewError(null);
    setIsSubmitting(true);
    try {
      const result = await createConsultationNote(patientId, {
        content: newContent,
      });
      if (!result.success) {
        showError(result.error);
        return;
      }
      setCurrentNotes((prev) => [result.note, ...prev]);
      setNewContent("");
      showSuccess(TOAST_MESSAGES.consultationNote.created);
      router.refresh();
    } catch (err) {
      console.error("[ConsultationNotes] create error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [newContent, patientId, router]);

  const startEditing = React.useCallback((note: ConsultationNoteData) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditError(null);
  }, []);

  const cancelEditing = React.useCallback(() => {
    setEditingId(null);
    setEditContent("");
    setEditError(null);
  }, []);

  const handleUpdate = React.useCallback(
    async (noteId: string) => {
      const error = validateContent(editContent);
      if (error) {
        setEditError(error);
        return;
      }
      setEditError(null);
      setIsSubmitting(true);
      try {
        const result = await updateConsultationNote(noteId, {
          content: editContent,
        });
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentNotes((prev) =>
          prev.map((n) => (n.id === noteId ? result.note : n))
        );
        cancelEditing();
        showSuccess(TOAST_MESSAGES.consultationNote.updated);
        router.refresh();
      } catch (err) {
        console.error("[ConsultationNotes] update error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editContent, cancelEditing, router]
  );

  const handleDelete = React.useCallback(
    async (noteId: string) => {
      const confirmed = window.confirm(
        "Êtes-vous sûr de vouloir supprimer cette note ? Cette action est définitive."
      );
      if (!confirmed) return;

      setIsSubmitting(true);
      try {
        const result = await deleteConsultationNote(noteId);
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentNotes((prev) => prev.filter((n) => n.id !== noteId));
        showSuccess(TOAST_MESSAGES.consultationNote.deleted);
        router.refresh();
      } catch (err) {
        console.error("[ConsultationNotes] delete error:", err);
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
            <NotebookPen className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-base font-semibold">
              Notes de consultation
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulaire d'ajout */}
          <div className="space-y-2">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Ajouter une note de consultation…"
              aria-label="Nouvelle note de consultation"
              aria-invalid={newError ? true : undefined}
              disabled={isSubmitting}
              rows={3}
            />
            {newError ? (
              <p className="text-sm text-rose-500">{newError}</p>
            ) : null}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={isSubmitting}>
                Ajouter la note
              </Button>
            </div>
          </div>

          {/* Liste des notes */}
          {currentNotes.length > 0 ? (
            <div className="space-y-3">
              {currentNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {formatDateTime(note.createdAt)}
                      </p>
                      {note.appointmentId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Rendez-vous rattaché
                        </span>
                      ) : null}
                    </div>
                    {editingId !== note.id ? (
                      <div className="flex items-center gap-1 text-slate-500">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                          aria-label="Modifier la note"
                          onClick={() => startEditing(note)}
                          disabled={isSubmitting}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50"
                          aria-label="Supprimer la note"
                          onClick={() => handleDelete(note.id)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {editingId === note.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        aria-label="Modifier la note de consultation"
                        aria-invalid={editError ? true : undefined}
                        disabled={isSubmitting}
                        rows={3}
                      />
                      {editError ? (
                        <p className="text-sm text-rose-500">{editError}</p>
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
                          onClick={() => handleUpdate(note.id)}
                          disabled={isSubmitting}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {note.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune note de consultation pour ce patient.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
