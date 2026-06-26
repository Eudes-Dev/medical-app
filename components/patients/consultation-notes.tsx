"use client";

/**
 * Section « Notes de consultation » de la fiche patient (story 9.1).
 *
 * Refonte UI (épopée 9 — handoff Claude Design « Dossier Patient ») : carte
 * premium avec en-tête en pastille dégradée, composer mis en avant, cartes de
 * notes à barre d'accent latérale, micro-interactions et animations `motion`.
 *
 * Le **contrat fonctionnel est strictement préservé** : props, types, Server
 * Actions, validation client miroir du serveur, état local optimiste +
 * `router.refresh()`, resync via `useEffect`. Seul le rendu change ; le
 * `window.confirm` historique est remplacé par une confirmation inline animée
 * (la confirmation reste obligatoire avant suppression).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { CalendarClock, Check, Loader2, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
  type ConsultationNoteData,
} from "@/app/dashboard/patients/consultation-note-actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import { CONSULTATION_NOTE_MAX_LENGTH } from "@/lib/validations/consultation-notes";
import {
  ACCENT,
  ACCENT_GRADIENT,
  AutoTextarea,
  DeleteConfirm,
  EASE,
  IconButton,
  PASTILLE_SHADOW,
  SectionShell,
  counterColor,
  useFlash,
} from "@/components/patients/patient-record-ui";

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
  const reduce = useReducedMotion();
  const { flashed, flash } = useFlash();

  const [currentNotes, setCurrentNotes] =
    React.useState<ConsultationNoteData[]>(notes);
  const [newContent, setNewContent] = React.useState("");
  const [newError, setNewError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // État d'édition inline.
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);

  // Confirmation de suppression inline (remplace `window.confirm`).
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  // Resynchronise l'état local si le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentNotes(notes);
  }, [notes]);

  const sortedNotes = React.useMemo(
    () =>
      [...currentNotes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [currentNotes],
  );

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
      flash(result.note.id);
      setNewContent("");
      showSuccess(TOAST_MESSAGES.consultationNote.created);
      router.refresh();
    } catch (err) {
      console.error("[ConsultationNotes] create error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [newContent, patientId, router, flash]);

  const startEditing = React.useCallback((note: ConsultationNoteData) => {
    setConfirmingId(null);
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
          prev.map((n) => (n.id === noteId ? result.note : n)),
        );
        cancelEditing();
        flash(noteId);
        showSuccess(TOAST_MESSAGES.consultationNote.updated);
        router.refresh();
      } catch (err) {
        console.error("[ConsultationNotes] update error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editContent, cancelEditing, router, flash],
  );

  const handleDelete = React.useCallback(
    async (noteId: string) => {
      setConfirmingId(null);
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
    [router],
  );

  const draftLen = newContent.length;

  return (
    <SectionShell
      icon={<NotebookPen size={22} />}
      title="Notes de consultation"
      subtitle="Historique clinique, du plus récent au plus ancien"
      badge={`${currentNotes.length} ${currentNotes.length > 1 ? "notes" : "note"}`}
    >
      {/* Composer */}
      <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-[11px] text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
          Nouvelle note
        </div>
        <AutoTextarea
          value={newContent}
          onChange={(e) => {
            setNewContent(e.target.value);
            if (newError) setNewError(null);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
          aria-invalid={newError ? true : undefined}
          aria-label="Contenu de la note"
          placeholder="Saisissez vos observations cliniques… (Ctrl/Cmd + Entrée pour enregistrer)"
          minHeight={88}
          disabled={isSubmitting}
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span
            aria-live="polite"
            className="min-h-[18px] text-[13px] font-semibold text-rose-600"
          >
            {newError ?? ""}
          </span>
          <div className="flex items-center gap-3.5">
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: counterColor(draftLen, CONSULTATION_NOTE_MAX_LENGTH) }}
            >
              {draftLen} / {CONSULTATION_NOTE_MAX_LENGTH}
            </span>
            <motion.button
              type="button"
              onClick={() => void handleAdd()}
              disabled={isSubmitting}
              aria-label="Ajouter la note"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-xl px-[17px] py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: ACCENT_GRADIENT, boxShadow: PASTILLE_SHADOW }}
            >
              {isSubmitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Plus size={17} strokeWidth={2.2} />
              )}
              {isSubmitting ? "Enregistrement…" : "Ajouter la note"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* État vide */}
      {currentNotes.length === 0 ? (
        <div className="px-4 py-[38px] text-center text-slate-400">
          <NotebookPen className="mx-auto mb-3 opacity-50" size={42} strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-500">
            Aucune note pour l&apos;instant
          </p>
          <p className="mt-1 text-[13px]">
            Commencez l&apos;historique clinique de ce patient.
          </p>
        </div>
      ) : null}

      {/* Liste des notes */}
      <div className="mt-4 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {sortedNotes.map((note, idx) => (
            <NoteCard
              key={note.id}
              note={note}
              index={idx}
              reduce={!!reduce}
              flashed={flashed.has(note.id)}
              isEditing={editingId === note.id}
              isConfirming={confirmingId === note.id}
              isSubmitting={isSubmitting}
              editContent={editContent}
              editError={editError}
              dateLabel={formatDateTime(note.createdAt)}
              onStartEdit={() => startEditing(note)}
              onEditChange={(v) => {
                setEditContent(v);
                if (editError) setEditError(null);
              }}
              onSaveEdit={() => void handleUpdate(note.id)}
              onCancelEdit={cancelEditing}
              onAskDelete={() => {
                setEditingId(null);
                setConfirmingId(note.id);
              }}
              onConfirmDelete={() => void handleDelete(note.id)}
              onCancelDelete={() => setConfirmingId(null)}
            />
          ))}
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}

const cardVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0, x: -10 },
};

type NoteCardProps = {
  note: ConsultationNoteData;
  index: number;
  reduce: boolean;
  flashed: boolean;
  isEditing: boolean;
  isConfirming: boolean;
  isSubmitting: boolean;
  editContent: string;
  editError: string | null;
  dateLabel: string;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function NoteCard({
  note,
  index,
  reduce,
  flashed,
  isEditing,
  isConfirming,
  isSubmitting,
  editContent,
  editError,
  dateLabel,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: NoteCardProps) {
  const editLen = editContent.length;

  return (
    <motion.div
      layout={!reduce}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: reduce ? 0.18 : 0.34,
        ease: EASE,
        delay: reduce ? 0 : Math.min(index, 10) * 0.045,
      }}
      style={{ overflow: "hidden" }}
    >
      <motion.div
        className="group rounded-[14px] border border-slate-200 px-4 py-3.5"
        style={{ borderLeft: `4px solid ${ACCENT}` }}
        animate={{ backgroundColor: flashed ? "#e0f2fe" : "#ffffff" }}
        transition={{ duration: flashed ? 0 : 1.1, ease: "easeOut" }}
        whileHover={reduce ? undefined : { boxShadow: "0 8px 22px -14px rgba(15,23,42,.4)" }}
      >
        {!isEditing ? (
          <>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-[7px] flex flex-wrap items-center gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">
                    {dateLabel}
                  </span>
                  {note.appointmentId ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-[3px] text-[11px] font-bold text-sky-700">
                      <CalendarClock size={13} />
                      Rendez-vous rattaché
                    </span>
                  ) : null}
                </div>
                <p className="m-0 whitespace-pre-wrap text-sm leading-[1.6] text-slate-700">
                  {note.content}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 opacity-45 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <IconButton label="Modifier la note" onClick={onStartEdit} disabled={isSubmitting} variant="edit">
                  <Pencil size={17} />
                </IconButton>
                <IconButton label="Supprimer la note" onClick={onAskDelete} disabled={isSubmitting} variant="delete">
                  <Trash2 size={17} />
                </IconButton>
              </div>
            </div>

            <AnimatePresence>
              {isConfirming ? (
                <DeleteConfirm
                  question="Supprimer cette note ?"
                  onConfirm={onConfirmDelete}
                  onCancel={onCancelDelete}
                  disabled={isSubmitting}
                />
              ) : null}
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AutoTextarea
              value={editContent}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelEdit();
                } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  onSaveEdit();
                }
              }}
              aria-label="Modifier la note"
              minHeight={78}
              editing
              disabled={isSubmitting}
            />
            <div className="mt-[9px] flex items-center justify-between gap-3">
              <span aria-live="polite" className="text-xs font-semibold text-rose-600">
                {editError ?? ""}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: counterColor(editLen, CONSULTATION_NOTE_MAX_LENGTH) }}
                >
                  {editLen} / {CONSULTATION_NOTE_MAX_LENGTH}
                </span>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={isSubmitting}
                  className="rounded-[10px] border border-slate-200 bg-white px-[13px] py-2 text-[13px] font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <motion.button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={isSubmitting}
                  whileTap={reduce ? undefined : { scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                  style={{ background: ACCENT_GRADIENT }}
                >
                  <Check size={15} strokeWidth={2.4} />
                  Enregistrer
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

