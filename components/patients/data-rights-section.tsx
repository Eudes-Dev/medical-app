"use client";

/**
 * Section « Données personnelles & RGPD » de la fiche patient (story 11.2).
 *
 * Expose au praticien les deux droits du patient sur ses données :
 *  - **Exporter les données (JSON)** — portabilité (art. 20). Le fichier est
 *    généré côté navigateur à partir de la chaîne renvoyée par la Server Action
 *    (Blob `application/json` + ancre `download`).
 *  - **Supprimer définitivement** — droit à l'oubli (art. 17). Confirmation
 *    explicite (irréversible/total) avant appel, puis redirection vers la liste.
 *
 * Réutilise le kit `patient-record-ui` pour rester cohérent avec les sections
 * 9.x / 11.1 du dossier patient.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";

import {
  exportPatientData,
  erasePatientData,
} from "@/app/dashboard/patients/data-rights-actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  DeleteConfirm,
  SectionShell,
} from "@/components/patients/patient-record-ui";

export type DataRightsSectionProps = {
  patientId: string;
  patientName?: string;
};

export function DataRightsSection({
  patientId,
  patientName,
}: DataRightsSectionProps) {
  const router = useRouter();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isErasing, setIsErasing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportPatientData(patientId);
      if (!result.success) {
        showError(result.error || TOAST_MESSAGES.dataRights.exportFailed);
        return;
      }
      // Génération du téléchargement côté navigateur.
      const blob = new Blob([result.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showSuccess(TOAST_MESSAGES.dataRights.exported);
    } catch (err) {
      console.error("[DataRightsSection] export error:", err);
      showError(TOAST_MESSAGES.dataRights.exportFailed);
    } finally {
      setIsExporting(false);
    }
  }, [patientId]);

  const handleErase = React.useCallback(async () => {
    setConfirming(false);
    setIsErasing(true);
    try {
      const result = await erasePatientData(patientId);
      if (!result.success) {
        showError(result.error);
        return;
      }
      showSuccess(TOAST_MESSAGES.dataRights.erased);
      router.push("/dashboard/patients");
      router.refresh();
    } catch (err) {
      console.error("[DataRightsSection] erase error:", err);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsErasing(false);
    }
  }, [patientId, router]);

  const busy = isExporting || isErasing;

  return (
    <SectionShell
      icon={<ShieldAlert size={22} />}
      title="Données personnelles & RGPD"
      subtitle="Droits du patient sur ses données : portabilité et effacement"
      badge="RGPD"
    >
      <p className="mb-4 rounded-[14px] border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
        Exportez l&apos;intégralité des données du patient dans un fichier
        structuré (droit à la <strong>portabilité</strong>, art. 20) ou supprimez
        définitivement le patient et toutes ses données (droit à l&apos;
        <strong>effacement</strong>, art. 17). La suppression est{" "}
        <strong>irréversible</strong>.
      </p>

      {/* Export */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} strokeWidth={2.2} />
          )}
          Exporter les données (JSON)
        </button>
      </div>

      {/* Zone danger : effacement */}
      <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50/60 p-4">
        <h3 className="m-0 text-sm font-bold text-rose-700">
          Supprimer définitivement
        </h3>
        <p className="mt-0.5 text-[13px] leading-snug text-rose-600/90">
          Efface le patient
          {patientName ? ` « ${patientName} »` : ""} et l&apos;ensemble de ses
          données (rendez-vous, notes, documents, antécédents, consentements).
          Cette action est irréversible.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-rose-600 px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {isErasing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} strokeWidth={2.2} />
            )}
            Supprimer définitivement le patient
          </button>
        </div>

        <AnimatePresence>
          {confirming ? (
            <DeleteConfirm
              question="Supprimer définitivement ce patient et toutes ses données ? Cette action est irréversible."
              onConfirm={() => void handleErase()}
              onCancel={() => setConfirming(false)}
              disabled={isErasing}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}
