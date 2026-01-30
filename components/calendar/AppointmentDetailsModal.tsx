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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CreateAppointmentModal } from "@/components/calendar/CreateAppointmentModal";
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
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim() || "Patient";
  const durationMinutes = getDurationMinutes(appointment.startTime, appointment.endTime);

  const handleStatusChange = useCallback(
    async (status: AppointmentStatus, label: string) => {
      setLoadingAction(label);
      try {
        const result = await updateAppointmentStatus(appointment.id, status);
        if (result.success) {
          toast.success(`Statut mis à jour: ${AppointmentStatusLabels[status]}`);
          clearCache();
          onUpdated();
        } else {
          toast.error(result.error ?? "Erreur lors du changement de statut.");
        }
      } finally {
        setLoadingAction(null);
      }
    },
    [appointment.id, clearCache, onUpdated]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Supprimer définitivement ce rendez-vous ?")) return;
    setLoadingAction("Supprimer");
    try {
      const result = await deleteAppointment(appointment.id);
      if (result.success) {
        toast.success("Rendez-vous supprimé.");
        clearCache();
        onClose();
      } else {
        toast.error(result.error ?? "Erreur lors de la suppression.");
      }
    } finally {
      setLoadingAction(null);
    }
  }, [appointment.id, clearCache, onClose]);

  const handleCancelAppointment = useCallback(() => {
    if (!confirm("Annuler ce rendez-vous ? Le patient en sera informé.")) return;
    handleStatusChange("CANCELLED", "Annuler");
  }, [handleStatusChange]);

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

      {/* Statut */}
      <div>
        <span className="text-sm font-medium text-muted-foreground">Statut</span>
        <p className="text-base">{AppointmentStatusLabels[appointment.status]}</p>
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
          <Button
            size="sm"
            className="bg-[#2563eb] hover:bg-[#2563eb]/90"
            disabled={!!loadingAction}
            onClick={() => handleStatusChange("CONFIRMED", "Confirmer")}
          >
            Confirmer
          </Button>
        )}
        {appointment.status !== "CANCELLED" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={!!loadingAction}
              onClick={handleCancelAppointment}
            >
              Annuler le RDV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!!loadingAction}
              onClick={() => handleStatusChange("COMPLETED", "Terminer")}
            >
              Terminer
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="bg-rose-500 hover:bg-rose-600"
          disabled={!!loadingAction}
          onClick={handleDelete}
        >
          Supprimer
        </Button>
      </div>
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
