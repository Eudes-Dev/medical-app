"use client";

/**
 * Bouton d'export CSV des statistiques du cabinet (story 10.2).
 *
 * Petit îlot client placé dans l'en-tête de la page Statistiques, à côté du
 * sélecteur de période. Au clic, appelle la Server Action
 * `exportCabinetStatisticsCsv(period)` (calcul **serveur**), puis déclenche le
 * téléchargement côté navigateur (Blob `text/csv` + ancre `download`) — même
 * patron que `components/patients/data-rights-section.tsx` (export RGPD 11.2).
 *
 * @module components/dashboard/analytics-export-button
 */

import * as React from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/ui/toast";
import { exportCabinetStatisticsCsv } from "@/app/dashboard/analytics/export-actions";
import type { StatsPeriod } from "@/lib/analytics/stats";

export interface AnalyticsExportButtonProps {
  period: StatsPeriod;
}

export function AnalyticsExportButton({ period }: AnalyticsExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportCabinetStatisticsCsv(period);
      if (!result.success) {
        showError(result.error);
        return;
      }
      // Génération du téléchargement côté navigateur.
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[AnalyticsExportButton] export error:", err);
      showError("Une erreur est survenue lors de l'export. Veuillez réessayer.");
    } finally {
      setIsExporting(false);
    }
  }, [period]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Exporter (CSV)
    </Button>
  );
}
