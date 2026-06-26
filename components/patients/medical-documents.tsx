"use client";

/**
 * Section « Documents médicaux » de la fiche patient (story 9.2).
 *
 * Refonte UI (épopée 9 — handoff Claude Design « Dossier Patient ») : zone de
 * dépôt drag & drop animée, aperçu du fichier sélectionné + choix de catégorie
 * en pilules, indicateur de téléversement, grille de cartes documents avec
 * pictogramme coloré par type MIME, et confirmation de suppression inline.
 *
 * Le **contrat fonctionnel est strictement préservé**, en particulier le flux
 * d'upload en deux temps conforme à l'ADR §5 :
 *  - `createMedicalDocument` crée la métadonnée et renvoie une URL signée ;
 *  - le binaire est déposé par le client navigateur Supabase
 *    (`uploadToSignedUrl`) ; en cas d'échec, rollback de la ligne orpheline ;
 *  - le téléchargement passe par une URL de lecture signée courte.
 * `storagePath` n'est jamais exposé.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

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
import {
  ACCENT,
  ACCENT_GRADIENT,
  ACCENT_SOFT,
  CategoryChip,
  type ChipStyle,
  DeleteConfirm,
  EASE,
  IconButton,
  PASTILLE_SHADOW,
  SectionShell,
  formatBytes,
  useFlash,
} from "@/components/patients/patient-record-ui";

export type MedicalDocumentsProps = {
  patientId: string;
  documents: MedicalDocumentData[];
};

/** Liste des MIME autorisés (pour l'attribut `accept` et la validation client). */
const ALLOWED_MIME = Object.keys(
  MEDICAL_DOCUMENT_ALLOWED_MIME,
) as MedicalDocumentMime[];

/** Teinte par catégorie de document (repérage visuel des chips). */
const CATEGORY_STYLE: Record<MedicalDocumentCategoryValue, ChipStyle> = {
  PRESCRIPTION: { color: "#0284c7", soft: "#e0f2fe", border: "#bae6fd" },
  REPORT: { color: "#7c3aed", soft: "#f5f3ff", border: "#ddd6fe" },
  IMAGING: { color: "#0d9488", soft: "#ccfbf1", border: "#99f6e4" },
  ANALYSIS: { color: "#d97706", soft: "#fffbeb", border: "#fde68a" },
  OTHER: { color: "#475569", soft: "#f1f5f9", border: "#e2e8f0" },
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

/** Valide un fichier localement (miroir de `medicalDocumentSchema`). */
function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type as MedicalDocumentMime)) {
    return "Format non autorisé — uniquement PDF, JPEG ou PNG.";
  }
  if (file.size <= 0) return "Le fichier est vide.";
  if (file.size > MEDICAL_DOCUMENT_MAX_SIZE_BYTES) {
    return "Fichier trop volumineux (10 Mo max).";
  }
  return null;
}

export function MedicalDocuments({ patientId, documents }: MedicalDocumentsProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { flashed, flash } = useFlash();

  const [currentDocs, setCurrentDocs] =
    React.useState<MedicalDocumentData[]>(documents);
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] =
    React.useState<MedicalDocumentCategoryValue>("PRESCRIPTION");
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Confirmation de suppression inline (remplace `window.confirm`).
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  // Resynchronise l'état local quand le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentDocs(documents);
  }, [documents]);

  const sortedDocs = React.useMemo(
    () =>
      [...currentDocs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [currentDocs],
  );

  const handleFile = React.useCallback((selected: File | null) => {
    if (!selected) return;
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setShakeKey((k) => k + 1);
      return;
    }
    setError(null);
    setSuccess(false);
    setFile(selected);
  }, []);

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0] ?? null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile],
  );

  const openPicker = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const cancelFile = React.useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  const handleUpload = React.useCallback(async () => {
    if (!file || isSubmitting) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setShakeKey((k) => k + 1);
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
      flash(result.document.id);
      setFile(null);
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 1400);
      showSuccess(TOAST_MESSAGES.medicalDocument.added);
      router.refresh();
    } catch (err) {
      console.error("[MedicalDocuments] add error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [file, isSubmitting, category, patientId, router, flash]);

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
      setConfirmingId(null);
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
    [router],
  );

  const fileIsPdf = file ? file.type === "application/pdf" : true;

  return (
    <SectionShell
      icon={<Paperclip size={22} />}
      title="Documents médicaux"
      subtitle="Ordonnances, comptes rendus, imagerie · PDF, JPEG, PNG"
      badge={`${currentDocs.length} ${currentDocs.length > 1 ? "documents" : "document"}`}
    >
      {/* Dropzone */}
      <motion.div
        role="button"
        tabIndex={0}
        aria-label="Zone de dépôt — glissez un fichier ou cliquez pour parcourir"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer?.files?.[0] ?? null);
        }}
        animate={
          shakeKey > 0 && !reduce
            ? { x: [0, -6, 6, -6, 6, 0] }
            : { scale: dragging ? 1.01 : 1 }
        }
        transition={{ duration: 0.42, ease: EASE }}
        key={shakeKey}
        className="cursor-pointer rounded-[20px] px-5 py-7 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
        style={{
          border: `2px dashed ${dragging ? ACCENT : "rgba(148,163,184,.55)"}`,
          background: dragging ? ACCENT_SOFT : "#f8fafc",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <motion.div
          className="mb-2.5 flex justify-center"
          style={{ color: ACCENT }}
          animate={dragging && !reduce ? { y: [0, -6, 0] } : { y: 0 }}
          transition={dragging ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
        >
          <UploadCloud size={38} strokeWidth={1.7} />
        </motion.div>
        <div className="text-[15px] font-bold text-slate-800">
          Glissez un fichier ici ou cliquez pour parcourir
        </div>
        <div className="mt-1 text-xs text-slate-400">PDF, JPEG, PNG · max 10 Mo</div>
      </motion.div>

      {/* Erreur de validation */}
      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 11 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div
              aria-live="polite"
              className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] font-semibold text-rose-700"
            >
              <AlertCircle size={17} />
              {error}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Aperçu du fichier sélectionné */}
      <AnimatePresence>
        {file ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px]"
                style={{
                  background: fileIsPdf ? "#fff1f2" : "#eef2ff",
                  color: fileIsPdf ? "#e11d48" : "#6366f1",
                }}
              >
                {fileIsPdf ? <FileText size={21} /> : <ImageIcon size={21} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-800">
                  {file.name}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatBytes(file.size)} ·{" "}
                  {MEDICAL_DOCUMENT_ALLOWED_MIME[
                    file.type as MedicalDocumentMime
                  ]?.toUpperCase() ?? ""}
                </div>
              </div>
              <IconButton
                label="Retirer le fichier"
                onClick={cancelFile}
                disabled={isSubmitting}
                variant="delete"
              >
                <X size={16} strokeWidth={2.2} />
              </IconButton>
            </div>

            <div className="mb-2 mt-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">
              Catégorie
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MEDICAL_DOCUMENT_CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat}
                  selected={cat === category}
                  style={CATEGORY_STYLE[cat]}
                  label={MEDICAL_DOCUMENT_CATEGORY_LABELS[cat]}
                  small
                  disabled={isSubmitting}
                  onSelect={() => setCategory(cat)}
                />
              ))}
            </div>

            {isSubmitting ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-sky-700">
                  <Loader2 size={16} className="animate-spin" />
                  Téléversement en cours…
                </div>
                <div className="relative h-[7px] overflow-hidden rounded-full bg-sky-100">
                  <motion.div
                    className="absolute left-0 top-0 h-full w-[35%] rounded-full"
                    style={{ background: ACCENT_GRADIENT }}
                    animate={reduce ? undefined : { x: ["-120%", "420%"] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={cancelFile}
                  className="rounded-[11px] border border-slate-200 bg-white px-[15px] py-2.5 text-[13px] font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <motion.button
                  type="button"
                  onClick={() => void handleUpload()}
                  aria-label="Téléverser le document"
                  whileHover={reduce ? undefined : { scale: 1.03 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[13px] font-bold text-white"
                  style={{ background: ACCENT_GRADIENT, boxShadow: PASTILLE_SHADOW }}
                >
                  <UploadCloud size={16} strokeWidth={2.2} />
                  Téléverser
                </motion.button>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Bandeau de succès */}
      <AnimatePresence>
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold text-emerald-700"
          >
            <CheckCircle2 size={18} />
            Document ajouté au dossier.
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* État vide */}
      {currentDocs.length === 0 ? (
        <div className="px-4 py-[34px] text-center text-slate-400">
          <FileText className="mx-auto mb-3 opacity-50" size={42} strokeWidth={1.5} />
          <p className="text-sm font-semibold text-slate-500">Aucun document</p>
          <p className="mt-1 text-[13px]">
            Déposez ordonnances, comptes rendus ou imagerie ici.
          </p>
        </div>
      ) : null}

      {/* Grille de documents */}
      <div
        className="mt-4 grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }}
      >
        <AnimatePresence initial={false}>
          {sortedDocs.map((doc, idx) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              index={idx}
              reduce={!!reduce}
              flashed={flashed.has(doc.id)}
              isConfirming={confirmingId === doc.id}
              isSubmitting={isSubmitting}
              dateLabel={formatDateTime(doc.createdAt)}
              onDownload={() => void handleDownload(doc.id)}
              onAskDelete={() => setConfirmingId(doc.id)}
              onConfirmDelete={() => void handleDelete(doc.id)}
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
  exit: { opacity: 0, height: 0, x: -10 },
};

type DocumentCardProps = {
  doc: MedicalDocumentData;
  index: number;
  reduce: boolean;
  flashed: boolean;
  isConfirming: boolean;
  isSubmitting: boolean;
  dateLabel: string;
  onDownload: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function DocumentCard({
  doc,
  index,
  reduce,
  flashed,
  isConfirming,
  isSubmitting,
  dateLabel,
  onDownload,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: DocumentCardProps) {
  const isPdf = doc.mimeType === "application/pdf";
  const cat = CATEGORY_STYLE[doc.category];

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
        delay: reduce ? 0 : Math.min(index, 10) * 0.045,
      }}
      style={{ overflow: "hidden" }}
    >
      <motion.div
        className="group h-full rounded-[15px] border border-slate-200 p-3.5"
        animate={{ backgroundColor: flashed ? "#e0f2fe" : "#ffffff" }}
        transition={{ duration: flashed ? 0 : 1.1, ease: "easeOut" }}
        whileHover={
          reduce
            ? undefined
            : { y: -2, boxShadow: "0 12px 26px -16px rgba(15,23,42,.45)" }
        }
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: isPdf ? "#fff1f2" : "#eef2ff",
              color: isPdf ? "#e11d48" : "#6366f1",
            }}
          >
            {isPdf ? <FileText size={22} /> : <ImageIcon size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-bold text-slate-800"
              title={doc.fileName}
            >
              {doc.fileName}
            </div>
            <div className="mt-1.5">
              <span
                className="inline-block rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                style={{ background: cat.soft, color: cat.color }}
              >
                {MEDICAL_DOCUMENT_CATEGORY_LABELS[doc.category]}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-slate-400">
              {formatBytes(doc.sizeBytes)} · {dateLabel}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onDownload}
            aria-label={`Télécharger ${doc.fileName}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-semibold text-sky-700 transition-colors hover:border-sky-200 hover:bg-sky-50"
          >
            <Download size={16} />
            Télécharger
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            disabled={isSubmitting}
            aria-label={`Supprimer ${doc.fileName}`}
            className="inline-flex w-[38px] items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <AnimatePresence>
          {isConfirming ? (
            <DeleteConfirm
              question="Supprimer ce document ?"
              onConfirm={onConfirmDelete}
              onCancel={onCancelDelete}
              disabled={isSubmitting}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
