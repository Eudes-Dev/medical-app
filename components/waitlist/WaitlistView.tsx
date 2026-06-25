"use client";

/**
 * Vue interactive de la liste d'attente (story 8.5).
 *
 * Rend la file priorisée (déjà triée côté serveur), gère l'ajout (modale), le
 * retrait (`removeFromWaitlist` + `confirm` natif) et la **conversion** en RDV :
 * « Programmer un rendez-vous » ouvre `CreateAppointmentModal` pré-remplie
 * (patient + soin) ; au succès de `createAppointment`, l'entrée est marquée
 * `SCHEDULED` (`markWaitlistScheduled`) puis la page est rafraîchie. Aucune
 * logique de création/anti-collision n'est dupliquée ici.
 *
 * @module components/waitlist/WaitlistView
 */

import * as React from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, Clock, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateAppointmentModal } from "@/components/calendar/CreateAppointmentModal";
import { AddToWaitlistModal } from "@/components/waitlist/AddToWaitlistModal";
import {
  removeFromWaitlist,
  markWaitlistScheduled,
} from "@/app/dashboard/waitlist/actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  WaitlistPriorityLabels,
  type WaitlistEntryWithPatient,
  type WaitlistPriority,
} from "@/types";
import { cn } from "@/lib/utils";

/** Classes de badge par niveau d'urgence (cohérent avec les conventions existantes). */
const PRIORITY_BADGE: Record<WaitlistPriority, string> = {
  URGENT: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  NORMAL: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export interface WaitlistViewProps {
  entries: WaitlistEntryWithPatient[];
}

export function WaitlistView({ entries }: WaitlistViewProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  /** Entrée en cours de conversion → pré-remplit `CreateAppointmentModal`. */
  const [converting, setConverting] = useState<WaitlistEntryWithPatient | null>(
    null,
  );
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = useCallback(
    async (entry: WaitlistEntryWithPatient) => {
      const name = `${entry.patient.firstName} ${entry.patient.lastName}`.trim();
      if (!confirm(`Retirer ${name || "ce patient"} de la liste d'attente ?`)) {
        return;
      }
      setRemovingId(entry.id);
      try {
        const result = await removeFromWaitlist(entry.id);
        if (result.success) {
          showSuccess(TOAST_MESSAGES.waitlist.removed);
          router.refresh();
        } else {
          showError(result.error || TOAST_MESSAGES.errors.server);
        }
      } finally {
        setRemovingId(null);
      }
    },
    [router],
  );

  /**
   * Succès de `createAppointment` (depuis la modal pré-remplie) → marque l'entrée
   * `SCHEDULED` puis rafraîchit. La modal a déjà affiché son toast de création ;
   * on ajoute le toast spécifique « programmé depuis la liste d'attente ».
   */
  const handleConverted = useCallback(
    async (appointment?: { id: string }) => {
      const entry = converting;
      setConverting(null);
      if (!entry || !appointment) {
        router.refresh();
        return;
      }
      const result = await markWaitlistScheduled(entry.id, appointment.id);
      if (result.success) {
        showSuccess(TOAST_MESSAGES.waitlist.scheduled);
      }
      router.refresh();
    },
    [converting, router],
  );

  if (entries.length === 0) {
    return (
      <>
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter à la liste d'attente
          </Button>
        </div>
        <EmptyState
          icon={Clock}
          title="Aucun patient en liste d'attente"
          description="Ajoutez un patient en attente d'un créneau ; il vous sera proposé quand un rendez-vous se libère."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Ajouter à la liste d'attente
            </Button>
          }
        />
        <AddToWaitlistModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onSuccess={() => router.refresh()}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {entries.length} patient{entries.length > 1 ? "s" : ""} en attente
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter à la liste d'attente
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {entries.map((entry) => {
          const name =
            `${entry.patient.firstName} ${entry.patient.lastName}`.trim() ||
            "Patient";
          return (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{name}</span>
                  <Badge
                    className={cn(
                      "border-transparent",
                      PRIORITY_BADGE[entry.priority],
                    )}
                  >
                    {WaitlistPriorityLabels[entry.priority]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {entry.serviceType ? entry.serviceType.label : "Tout soin"}
                  </span>
                </div>

                {(entry.preferredFrom || entry.preferredTo) && (
                  <p className="text-xs text-muted-foreground">
                    Souhaité&nbsp;:{" "}
                    {entry.preferredFrom
                      ? format(entry.preferredFrom, "d MMM yyyy", { locale: fr })
                      : "…"}{" "}
                    →{" "}
                    {entry.preferredTo
                      ? format(entry.preferredTo, "d MMM yyyy", { locale: fr })
                      : "…"}
                  </p>
                )}

                {entry.reason && (
                  <p className="text-sm text-foreground/80">{entry.reason}</p>
                )}

                <p className="text-xs text-muted-foreground">
                  Ajouté le{" "}
                  {format(entry.createdAt, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  onClick={() => setConverting(entry)}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Programmer un rendez-vous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={removingId === entry.id}
                  onClick={() => handleRemove(entry)}
                >
                  <Trash2 className="h-4 w-4" />
                  Retirer
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Modale d'ajout */}
      <AddToWaitlistModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Modale de conversion : création de RDV pré-remplie (patient + soin).
          La clé force un remount par entrée pour réinitialiser le pré-remplissage. */}
      {converting && (
        <CreateAppointmentModal
          key={converting.id}
          open={!!converting}
          onOpenChange={(open) => !open && setConverting(null)}
          initialPatientId={converting.patientId}
          initialServiceTypeId={converting.serviceType?.id}
          onSuccess={handleConverted}
        />
      )}
    </>
  );
}
