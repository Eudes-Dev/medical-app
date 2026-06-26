"use client";

/**
 * Section « Consentement RGPD » de la fiche patient (story 11.1).
 *
 * Première brique de l'épopée 11 : traçabilité de l'état courant du consentement
 * par finalité (données personnelles, données de santé, communications), avec
 * date et version de politique. Réutilise le kit visuel `patient-record-ui` pour
 * rester cohérent avec les sections 9.x du dossier patient.
 *
 * Contrat fonctionnel : props/types, Server Actions, validation client miroir du
 * serveur (note ≤ 500), état local optimiste + `router.refresh()`, resync via
 * `useEffect`.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  Loader2,
  RotateCcw,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

import {
  setConsentStatus,
  deleteConsentRecord,
  type ConsentRecordData,
} from "@/app/dashboard/patients/consent-actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  CONSENT_TYPES,
  CONSENT_TYPE_LABELS,
  CONSENT_TYPE_DESCRIPTIONS,
  CONSENT_NOTE_MAX_LENGTH,
  type ConsentType,
} from "@/lib/validations/consent";
import {
  ACCENT_GRADIENT,
  AutoTextarea,
  DeleteConfirm,
  PASTILLE_SHADOW,
  SectionShell,
  counterColor,
} from "@/components/patients/patient-record-ui";

export type ConsentSectionProps = {
  patientId: string;
  records: ConsentRecordData[];
};

/** Formate une date en français (ex. « 26/06/2026 »). */
function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Statut visuel dérivé de l'état d'un consentement. */
type StatusKind = "granted" | "revoked" | "unset";

function statusOf(record: ConsentRecordData | undefined): StatusKind {
  if (!record) return "unset";
  return record.granted ? "granted" : "revoked";
}

/** Badge de statut explicite (couleur + libellé daté). */
function StatusBadge({ record }: { record: ConsentRecordData | undefined }) {
  const kind = statusOf(record);
  if (kind === "granted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
        <ShieldCheck size={14} />
        {record?.grantedAt
          ? `Accordé le ${formatDate(record.grantedAt)}`
          : "Accordé"}
      </span>
    );
  }
  if (kind === "revoked") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
        <ShieldX size={14} />
        {record?.revokedAt
          ? `Retiré le ${formatDate(record.revokedAt)}`
          : "Retiré"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
      Non renseigné
    </span>
  );
}

export function ConsentSection({ patientId, records }: ConsentSectionProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [currentRecords, setCurrentRecords] =
    React.useState<ConsentRecordData[]>(records);
  // Note par finalité (préremplie depuis l'enregistrement existant).
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [noteError, setNoteError] = React.useState<Record<string, string>>({});
  const [submittingType, setSubmittingType] =
    React.useState<ConsentType | null>(null);
  const [confirmingType, setConfirmingType] =
    React.useState<ConsentType | null>(null);

  // Resynchronise l'état local si le serveur renvoie de nouvelles props.
  React.useEffect(() => {
    setCurrentRecords(records);
    const initial: Record<string, string> = {};
    for (const r of records) initial[r.type] = r.note ?? "";
    setNotes(initial);
  }, [records]);

  const recordByType = React.useMemo(() => {
    const map = new Map<ConsentType, ConsentRecordData>();
    for (const r of currentRecords) map.set(r.type, r);
    return map;
  }, [currentRecords]);

  const setNote = React.useCallback((type: ConsentType, value: string) => {
    setNotes((prev) => ({ ...prev, [type]: value }));
    setNoteError((prev) => (prev[type] ? { ...prev, [type]: "" } : prev));
  }, []);

  const handleSet = React.useCallback(
    async (type: ConsentType, granted: boolean) => {
      const note = notes[type] ?? "";
      if (note.trim().length > CONSENT_NOTE_MAX_LENGTH) {
        setNoteError((prev) => ({
          ...prev,
          [type]: `La note ne peut pas dépasser ${CONSENT_NOTE_MAX_LENGTH} caractères`,
        }));
        return;
      }
      setSubmittingType(type);
      try {
        const result = await setConsentStatus(patientId, {
          type,
          granted,
          note,
        });
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentRecords((prev) => {
          const others = prev.filter((r) => r.type !== type);
          return [...others, result.record];
        });
        showSuccess(
          granted
            ? TOAST_MESSAGES.consent.granted
            : TOAST_MESSAGES.consent.revoked
        );
        router.refresh();
      } catch (err) {
        console.error("[ConsentSection] set error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setSubmittingType(null);
      }
    },
    [notes, patientId, router]
  );

  const handleReset = React.useCallback(
    async (type: ConsentType) => {
      const record = recordByType.get(type);
      setConfirmingType(null);
      if (!record) return;
      setSubmittingType(type);
      try {
        const result = await deleteConsentRecord(record.id);
        if (!result.success) {
          showError(result.error);
          return;
        }
        setCurrentRecords((prev) => prev.filter((r) => r.type !== type));
        setNote(type, "");
        showSuccess(TOAST_MESSAGES.consent.reset);
        router.refresh();
      } catch (err) {
        console.error("[ConsentSection] reset error:", err);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setSubmittingType(null);
      }
    },
    [recordByType, router, setNote]
  );

  const grantedCount = currentRecords.filter((r) => r.granted).length;

  return (
    <SectionShell
      icon={<ShieldCheck size={22} />}
      title="Consentement RGPD"
      subtitle="Traçabilité du consentement recueilli, par finalité de traitement"
      badge={`${grantedCount} / ${CONSENT_TYPES.length} accordé${grantedCount > 1 ? "s" : ""}`}
    >
      <p className="mb-4 rounded-[14px] border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
        Enregistrez ici le consentement recueilli auprès du patient pour chaque
        finalité. Cette section constitue une <strong>preuve de recueil</strong>{" "}
        (statut, date, version de politique) et ne remplace pas l&apos;information
        légale due au patient.
      </p>

      <div className="flex flex-col gap-3">
        {CONSENT_TYPES.map((type) => {
          const record = recordByType.get(type);
          const kind = statusOf(record);
          const isSubmitting = submittingType === type;
          const noteValue = notes[type] ?? "";
          const noteLen = noteValue.length;

          return (
            <div
              key={type}
              className="rounded-[16px] border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-sm font-bold text-slate-900">
                    {CONSENT_TYPE_LABELS[type]}
                  </h3>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-500">
                    {CONSENT_TYPE_DESCRIPTIONS[type]}
                  </p>
                  {record?.policyVersion ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">
                      Politique {record.policyVersion}
                    </p>
                  ) : null}
                </div>
                <StatusBadge record={record} />
              </div>

              {/* Note optionnelle */}
              <div className="mt-3">
                <AutoTextarea
                  value={noteValue}
                  onChange={(e) => setNote(type, e.target.value)}
                  aria-label={`Note de consentement — ${CONSENT_TYPE_LABELS[type]}`}
                  placeholder="Note de contexte (optionnel, ex. « consentement papier signé le … »)"
                  minHeight={56}
                  disabled={isSubmitting}
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span
                    aria-live="polite"
                    className="min-h-[16px] text-xs font-semibold text-rose-600"
                  >
                    {noteError[type] ?? ""}
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: counterColor(noteLen, CONSENT_NOTE_MAX_LENGTH) }}
                  >
                    {noteLen} / {CONSENT_NOTE_MAX_LENGTH}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <motion.button
                  type="button"
                  onClick={() => void handleSet(type, true)}
                  disabled={isSubmitting || kind === "granted"}
                  aria-label={`Marquer ${CONSENT_TYPE_LABELS[type]} comme accordé`}
                  whileTap={reduce ? undefined : { scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                  style={{ background: ACCENT_GRADIENT, boxShadow: PASTILLE_SHADOW }}
                >
                  {isSubmitting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} strokeWidth={2.4} />
                  )}
                  Marquer comme accordé
                </motion.button>

                <button
                  type="button"
                  onClick={() => void handleSet(type, false)}
                  disabled={isSubmitting || kind === "revoked"}
                  aria-label={`Marquer ${CONSENT_TYPE_LABELS[type]} comme retiré`}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 disabled:opacity-50"
                >
                  <ShieldX size={15} />
                  Marquer comme retiré
                </button>

                {record ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingType(type)}
                    disabled={isSubmitting}
                    aria-label={`Réinitialiser le consentement ${CONSENT_TYPE_LABELS[type]}`}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                  >
                    <RotateCcw size={15} />
                    Réinitialiser
                  </button>
                ) : null}
              </div>

              <AnimatePresence>
                {confirmingType === type ? (
                  <DeleteConfirm
                    question="Réinitialiser ce consentement à « non renseigné » ?"
                    onConfirm={() => void handleReset(type)}
                    onCancel={() => setConfirmingType(null)}
                    disabled={isSubmitting}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
