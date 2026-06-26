"use client";

/**
 * Section « Antécédents médicaux » de la fiche patient (story 9.3).
 *
 * Refonte UI (épopée 9 — handoff Claude Design « Dossier Patient ») : vue
 * clinique de fond **regroupée par catégorie**, chaque catégorie ayant sa propre
 * identité couleur + icône. Composer en bloc « carte dans la carte », cartes à
 * barre d'accent latérale, édition inline (contenu + catégorie) faisant migrer
 * l'entrée vers son nouveau groupe, confirmation de suppression inline animée.
 *
 * Le **contrat fonctionnel est strictement préservé** : props, types, Server
 * Actions, validation client miroir du serveur, regroupement/tri, état local
 * optimiste + `router.refresh()`, resync via `useEffect`.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  Check,
  HeartPulse,
  Loader2,
  MoreHorizontal,
  Pencil,
  Pill,
  Plus,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react";

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
import {
  ACCENT_GRADIENT,
  AutoTextarea,
  CategoryChip,
  type ChipStyle,
  DeleteConfirm,
  EASE,
  IconButton,
  PASTILLE_SHADOW,
  SectionShell,
  counterColor,
  useFlash,
} from "@/components/patients/patient-record-ui";

export type MedicalHistoryProps = {
  patientId: string;
  entries: MedicalHistoryEntryData[];
};

/** Identité visuelle (couleur + icône) de chaque catégorie d'antécédent. */
const CATEGORY_META: Record<
  MedicalHistoryCategory,
  { style: ChipStyle; Icon: React.ComponentType<{ size?: number }> }
> = {
  ALLERGY: { style: { color: "#e11d48", soft: "#fff1f2", border: "#fecdd3" }, Icon: ShieldAlert },
  CURRENT_TREATMENT: { style: { color: "#059669", soft: "#ecfdf5", border: "#a7f3d0" }, Icon: Pill },
  SURGICAL_HISTORY: { style: { color: "#4f46e5", soft: "#eef2ff", border: "#c7d2fe" }, Icon: Stethoscope },
  FAMILY_HISTORY: { style: { color: "#d97706", soft: "#fffbeb", border: "#fde68a" }, Icon: Users },
  OTHER: { style: { color: "#475569", soft: "#f1f5f9", border: "#e2e8f0" }, Icon: MoreHorizontal },
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

/** Rangée de pilules de sélection de catégorie (composer + éditeur). */
function CategoryChips({
  selected,
  onSelect,
  small,
  disabled,
}: {
  selected: MedicalHistoryCategory;
  onSelect: (cat: MedicalHistoryCategory) => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MEDICAL_HISTORY_CATEGORIES.map((cat) => {
        const { style, Icon } = CATEGORY_META[cat];
        return (
          <CategoryChip
            key={cat}
            selected={cat === selected}
            style={style}
            label={MEDICAL_HISTORY_CATEGORY_LABELS[cat]}
            icon={<Icon size={small ? 13 : 15} />}
            small={small}
            disabled={disabled}
            onSelect={() => onSelect(cat)}
          />
        );
      })}
    </div>
  );
}

export function MedicalHistory({ patientId, entries }: MedicalHistoryProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { flashed, flash } = useFlash();

  const [currentEntries, setCurrentEntries] =
    React.useState<MedicalHistoryEntryData[]>(entries);
  const [newContent, setNewContent] = React.useState("");
  const [newCategory, setNewCategory] =
    React.useState<MedicalHistoryCategory>("ALLERGY");
  const [newError, setNewError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Édition inline (contenu + catégorie).
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState("");
  const [editCategory, setEditCategory] =
    React.useState<MedicalHistoryCategory>("ALLERGY");
  const [editError, setEditError] = React.useState<string | null>(null);

  // Confirmation de suppression inline (remplace `window.confirm`).
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  // Resynchronise l'état local si le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentEntries(entries);
  }, [entries]);

  const groups = React.useMemo(
    () =>
      MEDICAL_HISTORY_CATEGORIES.map((cat) => ({
        cat,
        items: currentEntries
          .filter((e) => e.category === cat)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      })).filter((g) => g.items.length > 0),
    [currentEntries],
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
      const result = await createMedicalHistoryEntry(patientId, {
        content: newContent,
        category: newCategory,
      });
      if (!result.success) {
        showError(result.error);
        return;
      }
      setCurrentEntries((prev) => [result.entry, ...prev]);
      flash(result.entry.id);
      setNewContent("");
      showSuccess(TOAST_MESSAGES.medicalHistory.created);
      router.refresh();
    } catch (err) {
      console.error("[MedicalHistory] create error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [newContent, newCategory, patientId, router, flash]);

  const startEditing = React.useCallback((entry: MedicalHistoryEntryData) => {
    setConfirmingId(null);
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
          prev.map((e) => (e.id === entryId ? result.entry : e)),
        );
        cancelEditing();
        flash(entryId);
        showSuccess(TOAST_MESSAGES.medicalHistory.updated);
        router.refresh();
      } catch (err) {
        console.error("[MedicalHistory] update error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editContent, editCategory, cancelEditing, router, flash],
  );

  const handleDelete = React.useCallback(
    async (entryId: string) => {
      setConfirmingId(null);
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
    [router],
  );

  const draftLen = newContent.length;

  return (
    <SectionShell
      icon={<HeartPulse size={22} />}
      title="Antécédents médicaux"
      subtitle="Vue clinique de fond, regroupée par catégorie"
      badge={`${currentEntries.length} ${currentEntries.length > 1 ? "entrées" : "entrée"}`}
    >
      {/* Composer */}
      <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-[11px] text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
          Ajouter un antécédent
        </div>
        <div className="mb-3">
          <CategoryChips
            selected={newCategory}
            onSelect={setNewCategory}
            disabled={isSubmitting}
          />
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
          aria-label="Contenu de l'antécédent"
          placeholder="Décrivez l'antécédent (allergie, traitement, intervention…)"
          minHeight={80}
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
              style={{ color: counterColor(draftLen, MEDICAL_HISTORY_CONTENT_MAX_LENGTH) }}
            >
              {draftLen} / {MEDICAL_HISTORY_CONTENT_MAX_LENGTH}
            </span>
            <motion.button
              type="button"
              onClick={() => void handleAdd()}
              disabled={isSubmitting}
              aria-label="Ajouter l'antécédent"
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
              {isSubmitting ? "Ajout…" : "Ajouter"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* État vide global */}
      {currentEntries.length === 0 ? (
        <div className="px-4 py-[38px] text-center text-slate-400">
          <HeartPulse className="mx-auto mb-3 opacity-50" size={42} strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-500">
            Aucun antécédent renseigné
          </p>
          <p className="mt-1 text-[13px]">
            Ajoutez allergies, traitements et antécédents pour une vue clinique
            complète.
          </p>
        </div>
      ) : null}

      {/* Groupes par catégorie */}
      <LayoutGroup>
        <div className="mt-1.5">
          <AnimatePresence initial={false}>
            {groups.map((group) => {
              const meta = CATEGORY_META[group.cat];
              return (
                <motion.div
                  key={group.cat}
                  layout={!reduce}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reduce ? 0.18 : 0.3, ease: EASE }}
                  style={{ overflow: "hidden" }}
                  className="mt-[18px] first:mt-0"
                >
                  {/* Bandeau de groupe */}
                  <div className="mb-[11px] flex items-center gap-2.5">
                    <span
                      className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
                      style={{ background: meta.style.soft, color: meta.style.color }}
                    >
                      <meta.Icon size={16} />
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {MEDICAL_HISTORY_CATEGORY_LABELS[group.cat]}
                    </span>
                    <span
                      className="rounded-full px-2 py-[3px] text-[11px] font-bold"
                      style={{ background: meta.style.soft, color: meta.style.color }}
                    >
                      {group.items.length}
                    </span>
                  </div>

                  {/* Cartes du groupe */}
                  <div className="flex flex-col gap-2.5">
                    <AnimatePresence initial={false}>
                      {group.items.map((entry, idx) => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          index={idx}
                          color={meta.style.color}
                          reduce={!!reduce}
                          flashed={flashed.has(entry.id)}
                          isEditing={editingId === entry.id}
                          isConfirming={confirmingId === entry.id}
                          isSubmitting={isSubmitting}
                          editContent={editContent}
                          editCategory={editCategory}
                          editError={editError}
                          dateLabel={formatDateTime(entry.createdAt)}
                          onStartEdit={() => startEditing(entry)}
                          onEditChange={(v) => {
                            setEditContent(v);
                            if (editError) setEditError(null);
                          }}
                          onEditCategory={setEditCategory}
                          onSaveEdit={() => void handleUpdate(entry.id)}
                          onCancelEdit={cancelEditing}
                          onAskDelete={() => {
                            setEditingId(null);
                            setConfirmingId(entry.id);
                          }}
                          onConfirmDelete={() => void handleDelete(entry.id)}
                          onCancelDelete={() => setConfirmingId(null)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </SectionShell>
  );
}

const cardVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, marginTop: 0, x: -10 },
};

type EntryCardProps = {
  entry: MedicalHistoryEntryData;
  index: number;
  color: string;
  reduce: boolean;
  flashed: boolean;
  isEditing: boolean;
  isConfirming: boolean;
  isSubmitting: boolean;
  editContent: string;
  editCategory: MedicalHistoryCategory;
  editError: string | null;
  dateLabel: string;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onEditCategory: (cat: MedicalHistoryCategory) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function EntryCard({
  entry,
  index,
  color,
  reduce,
  flashed,
  isEditing,
  isConfirming,
  isSubmitting,
  editContent,
  editCategory,
  editError,
  dateLabel,
  onStartEdit,
  onEditChange,
  onEditCategory,
  onSaveEdit,
  onCancelEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: EntryCardProps) {
  const editLen = editContent.length;

  return (
    <motion.div
      layout={!reduce}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: reduce ? 0.18 : 0.32,
        ease: EASE,
        delay: reduce ? 0 : Math.min(index, 8) * 0.04,
      }}
      style={{ overflow: "hidden" }}
    >
      <motion.div
        className="group rounded-[14px] border border-slate-200 px-3.5 py-3"
        style={{ borderLeft: `4px solid ${color}` }}
        animate={{ backgroundColor: flashed ? "#e0f2fe" : "#ffffff" }}
        transition={{ duration: flashed ? 0 : 1.1, ease: "easeOut" }}
        whileHover={reduce ? undefined : { boxShadow: "0 8px 22px -14px rgba(15,23,42,.4)" }}
      >
        {!isEditing ? (
          <>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">
                  {dateLabel}
                </div>
                <p className="m-0 whitespace-pre-wrap text-sm leading-[1.55] text-slate-700">
                  {entry.content}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 opacity-45 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <IconButton label="Modifier l'antécédent" onClick={onStartEdit} disabled={isSubmitting} variant="edit">
                  <Pencil size={17} />
                </IconButton>
                <IconButton label="Supprimer l'antécédent" onClick={onAskDelete} disabled={isSubmitting} variant="delete">
                  <Trash2 size={17} />
                </IconButton>
              </div>
            </div>

            <AnimatePresence>
              {isConfirming ? (
                <DeleteConfirm
                  question="Supprimer cet antécédent ?"
                  onConfirm={onConfirmDelete}
                  onCancel={onCancelDelete}
                  disabled={isSubmitting}
                />
              ) : null}
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-2.5">
              <CategoryChips
                selected={editCategory}
                onSelect={onEditCategory}
                small
                disabled={isSubmitting}
              />
            </div>
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
              aria-label="Modifier l'antécédent"
              minHeight={70}
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
                  style={{ color: counterColor(editLen, MEDICAL_HISTORY_CONTENT_MAX_LENGTH) }}
                >
                  {editLen} / {MEDICAL_HISTORY_CONTENT_MAX_LENGTH}
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
