"use client";

/**
 * Ligne d'édition d'un jour de la semaine (story 7.1).
 *
 * Présentationnel : tout l'état est détenu par `schedule-editor`. Affiche le
 * libellé du jour, un Switch d'ouverture/fermeture, la liste des plages
 * (heures début/fin, durée de créneau, Switch d'activation, suppression) et un
 * bouton d'ajout de plage. État vide ⇒ « Fermé ».
 *
 * @module components/settings/schedule-day-row
 */

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SLOT_DURATIONS,
  type DayErrors,
  type DayState,
  type RangeState,
} from "@/components/settings/schedule-model";

interface ScheduleDayRowProps {
  day: DayState;
  label: string;
  errors: DayErrors;
  onToggleDay: (open: boolean) => void;
  onAddRange: () => void;
  onRemoveRange: (rangeId: string) => void;
  onChangeRange: (rangeId: string, patch: Partial<RangeState>) => void;
}

export function ScheduleDayRow({
  day,
  label,
  errors,
  onToggleDay,
  onAddRange,
  onRemoveRange,
  onChangeRange,
}: ScheduleDayRowProps) {
  const isOpen = day.ranges.length > 0;
  const daySwitchId = `day-${day.dayOfWeek}-open`;

  return (
    <div className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{label}</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={daySwitchId} className="text-sm text-muted-foreground">
            {isOpen ? "Ouvert" : "Fermé"}
          </Label>
          <Switch
            id={daySwitchId}
            checked={isOpen}
            onCheckedChange={onToggleDay}
            aria-label={`Ouvrir ou fermer ${label}`}
          />
        </div>
      </div>

      {!isOpen ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Fermé toute la journée.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={onAddRange}
          >
            <Plus aria-hidden="true" />
            Ajouter une plage
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {day.ranges.map((range) => {
            const rangeErrors = errors.ranges[range.id];
            const startId = `range-${range.id}-start`;
            const endId = `range-${range.id}-end`;
            const durationId = `range-${range.id}-duration`;
            const activeId = `range-${range.id}-active`;
            const startErrId = `${startId}-error`;
            const endErrId = `${endId}-error`;

            return (
              <div
                key={range.id}
                className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={startId}>Début</Label>
                  <Input
                    id={startId}
                    type="time"
                    className="min-h-11 w-full sm:w-32"
                    value={range.startTime}
                    aria-invalid={rangeErrors?.startTime ? true : undefined}
                    aria-describedby={
                      rangeErrors?.startTime ? startErrId : undefined
                    }
                    onChange={(e) =>
                      onChangeRange(range.id, { startTime: e.target.value })
                    }
                  />
                  {rangeErrors?.startTime && (
                    <p id={startErrId} className="text-xs text-rose-500">
                      {rangeErrors.startTime}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={endId}>Fin</Label>
                  <Input
                    id={endId}
                    type="time"
                    className="min-h-11 w-full sm:w-32"
                    value={range.endTime}
                    aria-invalid={rangeErrors?.endTime ? true : undefined}
                    aria-describedby={rangeErrors?.endTime ? endErrId : undefined}
                    onChange={(e) =>
                      onChangeRange(range.id, { endTime: e.target.value })
                    }
                  />
                  {rangeErrors?.endTime && (
                    <p id={endErrId} className="text-xs text-rose-500">
                      {rangeErrors.endTime}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={durationId}>Durée du créneau</Label>
                  <Select
                    value={String(range.slotDuration)}
                    onValueChange={(v) =>
                      onChangeRange(range.id, { slotDuration: Number(v) })
                    }
                  >
                    <SelectTrigger
                      id={durationId}
                      className="min-h-11 w-full sm:w-36"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLOT_DURATIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 sm:pb-2.5">
                  <Switch
                    id={activeId}
                    checked={range.active}
                    onCheckedChange={(active) =>
                      onChangeRange(range.id, { active })
                    }
                    aria-label="Activer ou désactiver cette plage"
                  />
                  <Label htmlFor={activeId} className="text-sm text-muted-foreground">
                    {range.active ? "Active" : "Désactivée"}
                  </Label>
                </div>

                <div className="sm:ml-auto sm:pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-rose-500 hover:text-rose-600"
                    onClick={() => onRemoveRange(range.id)}
                    aria-label="Supprimer cette plage"
                  >
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </Button>
                </div>
              </div>
            );
          })}

          {errors.overlap && (
            <p role="alert" className="text-sm text-rose-500">
              {errors.overlap}
            </p>
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={onAddRange}
            >
              <Plus aria-hidden="true" />
              Ajouter une plage
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
