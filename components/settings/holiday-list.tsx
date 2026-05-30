"use client";

/**
 * Liste des jours fériés français pour une année (story 7.2, AC 2/9).
 *
 * Chaque férié est affiché avec un `Switch` qui active/désactive le blocage
 * via `toggleHoliday`. La désactivation n'efface pas la ligne (re-matérialisée
 * sinon au prochain `getTimeOffs`).
 *
 * @module components/settings/holiday-list
 */

import { useTransition } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

import type { TimeOffDTO } from "@/app/dashboard/settings/timeoff/actions";
import { toggleHoliday } from "@/app/dashboard/settings/timeoff/actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface HolidayListProps {
  holidays: TimeOffDTO[];
  onChanged: (id: string, active: boolean) => void;
}

export function HolidayList({ holidays, onChanged }: HolidayListProps) {
  const [isPending, startTransition] = useTransition();

  if (holidays.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun jour férié à afficher pour cette année.
      </p>
    );
  }

  const handleToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await toggleHoliday(id, active);
      if ("error" in res) {
        showError(res.error);
        return;
      }
      onChanged(id, active);
      showSuccess(
        active
          ? TOAST_MESSAGES.timeOff.holidayEnabled
          : TOAST_MESSAGES.timeOff.holidayDisabled,
      );
    });
  };

  return (
    <ul className="divide-y rounded-md border">
      {holidays.map((h) => {
        const date = parseISO(h.startDate);
        const switchId = `holiday-${h.id}`;
        return (
          <li
            key={h.id}
            className="flex items-center justify-between px-3 py-2"
          >
            <div className="flex flex-col">
              <Label htmlFor={switchId} className="cursor-pointer font-medium">
                {h.reason ?? "Jour férié"}
              </Label>
              <span className="text-xs text-muted-foreground">
                {format(date, "EEEE d MMMM yyyy", { locale: fr })}
              </span>
            </div>
            <Switch
              id={switchId}
              checked={h.active}
              disabled={isPending}
              aria-label={`Activer/désactiver ${h.reason ?? "ce jour férié"}`}
              onCheckedChange={(checked) => handleToggle(h.id, checked)}
            />
          </li>
        );
      })}
    </ul>
  );
}
