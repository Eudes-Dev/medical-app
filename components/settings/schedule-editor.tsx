"use client";

/**
 * Éditeur des horaires d'ouverture hebdomadaires (story 7.1).
 *
 * Détient l'état local des 7 jours, valide en continu (feedback inline) et
 * persiste via la Server Action `saveWorkingHours` (`useTransition` + toasts
 * `sonner`). Le bouton « Enregistrer » est désactivé tant qu'aucune
 * modification n'est en attente ou qu'une validation échoue (AC 7).
 *
 * @module components/settings/schedule-editor
 */

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  saveWorkingHours,
  type DayScheduleDTO,
} from "@/app/dashboard/settings/schedule/actions";
import { ScheduleDayRow } from "@/components/settings/schedule-day-row";
import {
  DAY_LABELS,
  DISPLAY_ORDER,
  createRange,
  hasDayErrors,
  serializeWeek,
  toWeekState,
  validateDay,
  type DayErrors,
  type DayState,
  type RangeState,
} from "@/components/settings/schedule-model";

interface ScheduleEditorProps {
  initialSchedule: DayScheduleDTO[];
}

export function ScheduleEditor({ initialSchedule }: ScheduleEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [week, setWeek] = useState<DayState[]>(() =>
    toWeekState(initialSchedule),
  );
  // Référence pour la détection de modifications ; remise à jour après save.
  const [baseline, setBaseline] = useState<string>(() =>
    serializeWeek(toWeekState(initialSchedule)),
  );

  const updateDay = (
    dayOfWeek: number,
    updater: (day: DayState) => DayState,
  ) => {
    setWeek((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? updater(d) : d)),
    );
  };

  const handleToggleDay = (dayOfWeek: number, open: boolean) =>
    updateDay(dayOfWeek, (d) => ({
      ...d,
      ranges: open ? [createRange()] : [],
    }));

  const handleAddRange = (dayOfWeek: number) =>
    updateDay(dayOfWeek, (d) => ({ ...d, ranges: [...d.ranges, createRange()] }));

  const handleRemoveRange = (dayOfWeek: number, rangeId: string) =>
    updateDay(dayOfWeek, (d) => ({
      ...d,
      ranges: d.ranges.filter((r) => r.id !== rangeId),
    }));

  const handleChangeRange = (
    dayOfWeek: number,
    rangeId: string,
    patch: Partial<RangeState>,
  ) =>
    updateDay(dayOfWeek, (d) => ({
      ...d,
      ranges: d.ranges.map((r) => (r.id === rangeId ? { ...r, ...patch } : r)),
    }));

  const errorsByDay = useMemo(() => {
    const map: Record<number, DayErrors> = {};
    for (const d of week) map[d.dayOfWeek] = validateDay(d);
    return map;
  }, [week]);

  const hasErrors = useMemo(
    () => Object.values(errorsByDay).some(hasDayErrors),
    [errorsByDay],
  );

  const isDirty = useMemo(
    () => serializeWeek(week) !== baseline,
    [week, baseline],
  );

  const handleSave = () => {
    if (!isDirty || hasErrors) return;
    const snapshot = serializeWeek(week);
    const payload = week.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      ranges: d.ranges.map(({ id: _id, ...r }) => r),
    }));

    startTransition(async () => {
      const result = await saveWorkingHours(payload);
      if ("success" in result) {
        setBaseline(snapshot);
        showSuccess(TOAST_MESSAGES.schedule.saved);
      } else {
        // Conservation des saisies : on ne touche pas à `week` en cas d'erreur.
        showError(result.error ?? TOAST_MESSAGES.errors.server);
      }
    });
  };

  const saveDisabled = !isDirty || hasErrors || isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {DISPLAY_ORDER.map((dayOfWeek) => {
          const day = week[dayOfWeek];
          if (!day) return null;
          return (
            <ScheduleDayRow
              key={dayOfWeek}
              day={day}
              label={DAY_LABELS[dayOfWeek]}
              errors={errorsByDay[dayOfWeek] ?? { ranges: {} }}
              onToggleDay={(open) => handleToggleDay(dayOfWeek, open)}
              onAddRange={() => handleAddRange(dayOfWeek)}
              onRemoveRange={(rangeId) => handleRemoveRange(dayOfWeek, rangeId)}
              onChangeRange={(rangeId, patch) =>
                handleChangeRange(dayOfWeek, rangeId, patch)
              }
            />
          );
        })}
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {hasErrors
            ? "Corrigez les erreurs avant d'enregistrer."
            : isDirty
              ? "Modifications non enregistrées."
              : "À jour."}
        </p>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          aria-disabled={saveDisabled}
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
