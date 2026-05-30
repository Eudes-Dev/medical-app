"use client";

/**
 * Formulaire de création d'une exception d'agenda (story 7.2, AC 1/4/5/7/9).
 *
 * Flux :
 * 1. Saisie (DateRangePicker, toggle allDay, heures si plage partielle, motif).
 * 2. Validation Zod en continu pour feedback inline.
 * 3. Au submit : `previewTimeOffImpact` → si RDV impactés, on bascule sur
 *    `TimeOffImpactWarning` (choix explicite d'annuler ou non) avant
 *    `createTimeOff`. Aucun RDV n'est touché sans cette confirmation.
 *
 * @module components/settings/timeoff-form
 */

import { useState, useTransition } from "react";
import type { DateRange } from "react-day-picker";

import {
  createTimeOff,
  previewTimeOffImpact,
  type ImpactedAppointmentDTO,
} from "@/app/dashboard/settings/timeoff/actions";
import {
  timeOffSchema,
  TIME_OFF_REASON_MAX_LENGTH,
} from "@/lib/validations/time-off";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TimeOffImpactWarning } from "@/components/settings/timeoff-impact-warning";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

type Step = "form" | "review";

interface TimeOffFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

function buildPayload(state: {
  range: DateRange | undefined;
  allDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}) {
  if (!state.range?.from) return null;
  return {
    startDate: state.range.from,
    endDate: state.range.to ?? state.range.from,
    allDay: state.allDay,
    startTime: state.allDay ? undefined : state.startTime || undefined,
    endTime: state.allDay ? undefined : state.endTime || undefined,
    reason: state.reason.trim() ? state.reason.trim() : undefined,
  };
}

export function TimeOffForm({ onCreated, onCancel }: TimeOffFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [range, setRange] = useState<DateRange | undefined>();
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [impacted, setImpacted] = useState<ImpactedAppointmentDTO[]>([]);
  const [isPending, startTransition] = useTransition();

  const payload = buildPayload({ range, allDay, startTime, endTime, reason });
  const validation = payload ? timeOffSchema.safeParse(payload) : null;
  const isValid = validation?.success ?? false;
  const inlineError = !validation
    ? null
    : validation.success
      ? null
      : validation.error.issues[0]?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) {
      setValidationError("Sélectionnez une plage de dates.");
      return;
    }
    const parsed = timeOffSchema.safeParse(payload);
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Données invalides.",
      );
      return;
    }
    setValidationError(null);

    startTransition(async () => {
      const result = await previewTimeOffImpact(payload);
      if ("error" in result) {
        showError(result.error);
        return;
      }
      if (result.impacted.length === 0) {
        // Pas de RDV impacté → création directe.
        const created = await createTimeOff(payload);
        if ("error" in created) {
          showError(created.error);
          return;
        }
        showSuccess(TOAST_MESSAGES.timeOff.created);
        onCreated();
        return;
      }
      setImpacted(result.impacted);
      setStep("review");
    });
  };

  const handleConfirmReview = (notify: boolean) => {
    if (!payload) return;
    startTransition(async () => {
      const created = await createTimeOff(payload, {
        notifyCancellations: notify,
      });
      if ("error" in created) {
        showError(created.error);
        return;
      }
      showSuccess(TOAST_MESSAGES.timeOff.created);
      if (notify && created.notifiedCount > 0) {
        showSuccess(TOAST_MESSAGES.timeOff.cancellationsSent);
      }
      onCreated();
    });
  };

  if (step === "review") {
    return (
      <TimeOffImpactWarning
        impacted={impacted}
        isPending={isPending}
        onConfirm={handleConfirmReview}
        onCancel={() => setStep("form")}
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timeoff-range">Période</Label>
        <DateRangePicker
          id="timeoff-range"
          value={range}
          onChange={setRange}
          placeholder="Sélectionner la plage de dates"
          ariaLabel="Plage de dates de l'exception"
          disablePastDates
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="timeoff-all-day"
          checked={allDay}
          onCheckedChange={setAllDay}
        />
        <Label htmlFor="timeoff-all-day" className="cursor-pointer">
          Journée(s) entière(s)
        </Label>
      </div>

      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="timeoff-start-time">Heure de début</Label>
            <Input
              id="timeoff-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timeoff-end-time">Heure de fin</Label>
            <Input
              id="timeoff-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="timeoff-reason">
          Motif (optionnel, max {TIME_OFF_REASON_MAX_LENGTH} caractères)
        </Label>
        <Textarea
          id="timeoff-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. Congés d'été, formation, fermeture…"
          maxLength={TIME_OFF_REASON_MAX_LENGTH}
          rows={2}
        />
      </div>

      {(validationError || inlineError) && (
        <p role="alert" className="text-sm text-destructive">
          {validationError ?? inlineError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? "Vérification…" : "Continuer"}
        </Button>
      </div>
    </form>
  );
}
