"use client";

/**
 * Modal de détails d'un rendez-vous (Story 3.3 - Task 7, 8).
 *
 * - Desktop: Dialog Shadcn
 * - Mobile: Sheet/Drawer (cohérence Story 3.2)
 *
 * Affiche: patient (lien fiche), date/heure début, durée, type, statut, notes.
 * Actions: Modifier, Confirmer, Annuler, Terminer, Supprimer (avec confirmations).
 */

import * as React from "react";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { showError, showInfo, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import { CreateAppointmentModal } from "@/components/calendar/CreateAppointmentModal";
import { getMatchingWaitlistEntries } from "@/app/dashboard/waitlist/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AppointmentStatusLabels,
  type AppointmentWithPatient,
  type AppointmentStatus,
} from "@/types";
import { getDurationMinutes } from "@/components/calendar/calendar-utils";
import {
  updateAppointmentStatus,
  deleteAppointment,
  cancelAppointmentSeries,
  deleteAppointmentSeries,
} from "@/app/dashboard/calendar/actions";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useIsMobile } from "@/hooks/use-mobile";

export interface AppointmentDetailsModalProps {
  /** RDV affiché (null = modal fermée) */
  appointment: AppointmentWithPatient | null;
  /** Contrôle l'ouverture (fermeture = passer null ou appel onOpenChange(false)) */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Contenu commun: infos du RDV + boutons d'action (Modifier, statut, Supprimer).
 */
function DetailsContent({
  appointment,
  onClose,
  onUpdated,
  onEditRequested,
}: {
  appointment: AppointmentWithPatient;
  onClose: () => void;
  onUpdated: () => void;
  /** Ouvre le modal d'édition du RDV */
  onEditRequested?: () => void;
}) {
  const clearCache = useCalendarStore((s) => s.clearCache);
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim() || "Patient";
  const durationMinutes = getDurationMinutes(appointment.startTime, appointment.endTime);

  /**
   * Story 8.5 — rappel « créneau libéré » : après une annulation/suppression,
   * cherche les patients en attente **compatibles** avec ce créneau et affiche un
   * rappel non bloquant (toast + lien vers la liste d'attente) s'il y en a.
   * Best-effort : un échec du matching n'impacte jamais l'annulation (catch).
   */
  const notifyWaitlistMatches = useCallback(async () => {
    try {
      const matches = await getMatchingWaitlistEntries({
        startTime: appointment.startTime,
        serviceTypeId: appointment.serviceTypeId ?? undefined,
        durationMin: durationMinutes,
      });
      if (matches.length > 0) {
        showInfo(
          `${matches.length} patient${matches.length > 1 ? "s" : ""} en attente pour ce créneau`,
          {
            description: "Un créneau vient de se libérer.",
            action: {
              label: "Voir la liste d'attente",
              onClick: () => router.push("/dashboard/waitlist"),
            },
          },
        );
      }
    } catch (e) {
      console.error("[waitlist:match] échec du matching:", e);
    }
  }, [appointment.startTime, appointment.serviceTypeId, durationMinutes, router]);

  const handleStatusChange = useCallback(
    async (status: AppointmentStatus, label: string) => {
      setLoadingAction(label);
      try {
        const result = await updateAppointmentStatus(appointment.id, status);
        if (result.success) {
          showSuccess(
            status === "CANCELLED"
              ? TOAST_MESSAGES.appointment.cancelled
              : TOAST_MESSAGES.appointment.statusUpdated,
          );
          clearCache();
          // Story 8.5 : un créneau annulé peut intéresser des patients en attente.
          if (status === "CANCELLED") void notifyWaitlistMatches();
          onUpdated();
        } else {
          showError(TOAST_MESSAGES.errors.server);
        }
      } finally {
        setLoadingAction(null);
      }
    },
    [appointment.id, clearCache, onUpdated, notifyWaitlistMatches]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Supprimer définitivement ce rendez-vous ?")) return;
    setLoadingAction("Supprimer");
    try {
      const result = await deleteAppointment(appointment.id);
      if (result.success) {
        showSuccess(TOAST_MESSAGES.appointment.deleted);
        clearCache();
        // Story 8.5 : créneau supprimé → rappel des patients en attente compatibles.
        void notifyWaitlistMatches();
        onClose();
      } else {
        showError(TOAST_MESSAGES.errors.server);
      }
    } finally {
      setLoadingAction(null);
    }
  }, [appointment.id, clearCache, onClose, notifyWaitlistMatches]);

  const handleCancelAppointment = useCallback(() => {
    if (!confirm("Annuler ce rendez-vous ? Le patient en sera informé.")) return;
    handleStatusChange("CANCELLED", "Annuler");
  }, [handleStatusChange]);

  // Story 8.4 — gestion de la série « à venir » (à partir de ce RDV).
  const handleCancelSeries = useCallback(async () => {
    if (!appointment.seriesId) return;
    if (
      !confirm(
        "Annuler tous les rendez-vous à venir de cette série (à partir de celui-ci) ? Les rendez-vous passés ne sont pas touchés.",
      )
    )
      return;
    setLoadingAction("AnnulerSérie");
    try {
      const result = await cancelAppointmentSeries(
        appointment.seriesId,
        appointment.startTime,
      );
      if (result.success) {
        showSuccess(
          `${TOAST_MESSAGES.appointment.seriesCancelled} ${result.affected} rendez-vous annulé${result.affected > 1 ? "s" : ""}.`,
        );
        clearCache();
        // Story 8.5 : ce créneau (1ʳᵉ occurrence libérée) peut intéresser la file.
        void notifyWaitlistMatches();
        onClose();
      } else {
        showError(TOAST_MESSAGES.errors.server);
      }
    } finally {
      setLoadingAction(null);
    }
  }, [appointment.seriesId, appointment.startTime, clearCache, onClose, notifyWaitlistMatches]);

  const handleDeleteSeries = useCallback(async () => {
    if (!appointment.seriesId) return;
    if (
      !confirm(
        "Supprimer définitivement tous les rendez-vous à venir de cette série (à partir de celui-ci) ? Les rendez-vous passés ne sont pas touchés.",
      )
    )
      return;
    setLoadingAction("SupprimerSérie");
    try {
      const result = await deleteAppointmentSeries(
        appointment.seriesId,
        appointment.startTime,
      );
      if (result.success) {
        showSuccess(
          `${TOAST_MESSAGES.appointment.seriesDeleted} ${result.affected} rendez-vous supprimé${result.affected > 1 ? "s" : ""}.`,
        );
        clearCache();
        // Story 8.5 : créneau de série supprimé → rappel des patients en attente.
        void notifyWaitlistMatches();
        onClose();
      } else {
        showError(TOAST_MESSAGES.errors.server);
      }
    } finally {
      setLoadingAction(null);
    }
  }, [appointment.seriesId, appointment.startTime, clearCache, onClose, notifyWaitlistMatches]);

  return (
    <div className="space-y-4">
      {/* Patient — lien vers la fiche patient */}
      <div>
        <span className="text-sm font-medium text-muted-foreground">Patient</span>
        <p className="text-base">
          <Link
            href={`/dashboard/patients/${appointment.patient.id}`}
            className="text-[#2563eb] hover:underline"
          >
            {patientName}
          </Link>
        </p>
      </div>

      {/* Date et heure de début */}
      <div>
        <span className="text-sm font-medium text-muted-foreground">Date et heure</span>
        <p className="text-base">
          {format(appointment.startTime, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
        </p>
      </div>

      {/* Durée (dérivée de startTime/endTime) */}
      <div>
        <span className="text-sm font-medium text-muted-foreground">Durée</span>
        <p className="text-base">{durationMinutes} min</p>
      </div>

      {/* Type */}
      <div>
        <span className="text-sm font-medium text-muted-foreground">Type</span>
        <p className="text-base">{appointment.type}</p>
      </div>

      {/* Statut (+ marqueur de série, story 8.4) */}
      <div>
        <span className="text-sm font-medium text-muted-foreground">Statut</span>
        <p className="flex items-center gap-2 text-base">
          {AppointmentStatusLabels[appointment.status]}
          {appointment.seriesId && (
            <span
              className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              title="Ce rendez-vous fait partie d'une série récurrente"
            >
              Série
            </span>
          )}
        </p>
      </div>

      {/* Notes optionnelles */}
      {appointment.notes && (
        <div>
          <span className="text-sm font-medium text-muted-foreground">Notes</span>
          <p className="text-base whitespace-pre-wrap">{appointment.notes}</p>
        </div>
      )}

      {/* Actions: Modifier, statut, suppression */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {onEditRequested && (
          <Button
            size="sm"
            variant="outline"
            disabled={!!loadingAction}
            onClick={onEditRequested}
          >
            Modifier
          </Button>
        )}
        {appointment.status === "PENDING" && (
          <LoadingButton
            size="sm"
            className="bg-[#2563eb] hover:bg-[#2563eb]/90"
            isLoading={loadingAction === "Confirmer"}
            disabled={!!loadingAction && loadingAction !== "Confirmer"}
            onClick={() => handleStatusChange("CONFIRMED", "Confirmer")}
          >
            Confirmer
          </LoadingButton>
        )}
        {appointment.status !== "CANCELLED" && (
          <>
            <LoadingButton
              size="sm"
              variant="outline"
              isLoading={loadingAction === "Annuler"}
              disabled={!!loadingAction && loadingAction !== "Annuler"}
              onClick={handleCancelAppointment}
            >
              Annuler le RDV
            </LoadingButton>
            <LoadingButton
              size="sm"
              variant="outline"
              isLoading={loadingAction === "Terminer"}
              disabled={!!loadingAction && loadingAction !== "Terminer"}
              onClick={() => handleStatusChange("COMPLETED", "Terminer")}
            >
              Terminer
            </LoadingButton>
          </>
        )}
        <LoadingButton
          size="sm"
          variant="destructive"
          className="bg-rose-500 hover:bg-rose-600"
          isLoading={loadingAction === "Supprimer"}
          disabled={!!loadingAction && loadingAction !== "Supprimer"}
          onClick={handleDelete}
        >
          Supprimer
        </LoadingButton>
      </div>

      {/* Actions de série (story 8.4) — n'apparaissent que pour un RDV récurrent.
          Elles s'ajoutent aux actions unitaires ci-dessus (« cet épisode »). */}
      {appointment.seriesId && (
        <div className="space-y-2 pt-2 border-t">
          <span className="text-sm font-medium text-muted-foreground">
            Série récurrente
          </span>
          <div className="flex flex-wrap gap-2">
            {appointment.status !== "CANCELLED" && (
              <LoadingButton
                size="sm"
                variant="outline"
                isLoading={loadingAction === "AnnulerSérie"}
                disabled={!!loadingAction && loadingAction !== "AnnulerSérie"}
                onClick={handleCancelSeries}
              >
                Annuler toute la série à venir
              </LoadingButton>
            )}
            <LoadingButton
              size="sm"
              variant="destructive"
              className="bg-rose-500 hover:bg-rose-600"
              isLoading={loadingAction === "SupprimerSérie"}
              disabled={!!loadingAction && loadingAction !== "SupprimerSérie"}
              onClick={handleDeleteSeries}
            >
              Supprimer toute la série à venir
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modal de détails: Dialog sur desktop, Sheet sur mobile.
 * Bouton "Modifier" ouvre CreateAppointmentModal en mode édition.
 */
export function AppointmentDetailsModal({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsModalProps) {
  const isMobile = useIsMobile();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleUpdated = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleEditModalOpenChange = useCallback((editOpen: boolean) => {
    setEditModalOpen(editOpen);
  }, []);

  /** Après modification réussie: fermer le modal de détails */
  const handleEditSuccess = useCallback(() => {
    handleUpdated();
  }, [handleUpdated]);

  if (!appointment) return null;

  const title = "Détail du rendez-vous";
  const description = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

  const detailsContent = (
    <DetailsContent
      appointment={appointment}
      onClose={handleClose}
      onUpdated={handleUpdated}
      onEditRequested={() => setEditModalOpen(true)}
    />
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            className="max-h-[80vh] overflow-y-auto rounded-t-xl"
          >
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="mt-4">{detailsContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {detailsContent}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal d'édition (même formulaire que création, pré-rempli); onSuccess ferme le détail */}
      <CreateAppointmentModal
        open={editModalOpen}
        onOpenChange={handleEditModalOpenChange}
        appointment={appointment}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
