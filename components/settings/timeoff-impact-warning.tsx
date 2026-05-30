"use client";

/**
 * Avertissement RDV impactés (story 7.2, AC 4/7).
 *
 * Composant **purement présentiel** : il liste les rendez-vous tombant dans la
 * fenêtre proposée, expose la case « Prévenir les patients (annule les RDV) »
 * (décochée par défaut, jamais silencieux) et délègue l'action au parent via
 * `onConfirm`. La décision finale (annuler ou non) reste au praticien.
 *
 * @module components/settings/timeoff-impact-warning
 */

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";

import type { ImpactedAppointmentDTO } from "@/app/dashboard/settings/timeoff/actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TimeOffImpactWarningProps {
  impacted: ImpactedAppointmentDTO[];
  isPending: boolean;
  onConfirm: (notifyCancellations: boolean) => void;
  onCancel: () => void;
}

export function TimeOffImpactWarning({
  impacted,
  isPending,
  onConfirm,
  onCancel,
}: TimeOffImpactWarningProps) {
  const [notify, setNotify] = useState(false);
  const withEmail = impacted.filter((a) => !!a.patient.email).length;
  const withoutEmail = impacted.length - withEmail;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <AlertTriangle
          className="size-5 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {impacted.length} rendez-vous{impacted.length > 1 ? " sont" : " est"}{" "}
            concerné{impacted.length > 1 ? "s" : ""} par cette période.
          </p>
          <p className="text-amber-800">
            Sans action explicite de votre part, ces RDV restent dans l&apos;agenda
            (mais hors disponibilités publiques).
          </p>
        </div>
      </div>

      <ul
        className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm"
        aria-label="Rendez-vous impactés"
      >
        {impacted.map((a) => {
          const start = new Date(a.startTime);
          const end = new Date(a.endTime);
          return (
            <li key={a.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">
                  {a.patient.firstName} {a.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(start, "EEEE d MMM — HH:mm", { locale: fr })}
                  {" → "}
                  {format(end, "HH:mm", { locale: fr })} · {a.type}
                </p>
              </div>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-xs " +
                  (a.patient.email
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-600")
                }
              >
                {a.patient.email ? "email" : "sans email"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3">
        <Switch
          id="notify-cancellations"
          checked={notify}
          onCheckedChange={setNotify}
          disabled={isPending}
        />
        <Label
          htmlFor="notify-cancellations"
          className="cursor-pointer text-sm"
        >
          Prévenir les patients par email (annule les RDV)
        </Label>
      </div>
      {notify && (
        <p className="text-xs text-muted-foreground">
          {withEmail} email{withEmail > 1 ? "s" : ""} envoyé
          {withEmail > 1 ? "s" : ""}. {withoutEmail} patient
          {withoutEmail > 1 ? "s" : ""} sans email ne sera pas prévenu.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Retour
        </Button>
        <Button
          type="button"
          variant={notify ? "destructive" : "default"}
          onClick={() => onConfirm(notify)}
          disabled={isPending}
        >
          {isPending
            ? "Enregistrement…"
            : notify
              ? "Bloquer et annuler les RDV"
              : "Bloquer (conserver les RDV)"}
        </Button>
      </div>
    </div>
  );
}
