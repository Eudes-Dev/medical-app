"use client";

/**
 * Sélecteur de plage de dates (story 7.2) — `Popover` + `Calendar` (mode range).
 *
 * Affiche un bouton (trigger) qui ouvre un popover contenant un calendrier en
 * `mode="range"`. Locale française via `date-fns/locale/fr`.
 *
 * @module components/ui/date-range-picker
 */

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type { DateRange } from "react-day-picker";

export interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  /** Texte affiché quand aucune date n'est sélectionnée. */
  placeholder?: string;
  /** Désactive la sélection de dates strictement antérieures à aujourd'hui. */
  disablePastDates?: boolean;
  /** `aria-label` du bouton (a11y). */
  ariaLabel?: string;
  className?: string;
  id?: string;
}

function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return "";
  const fmt = (d: Date) => format(d, "dd MMM yyyy", { locale: fr });
  if (!range.to || range.to.getTime() === range.from.getTime()) {
    return fmt(range.from);
  }
  return `${fmt(range.from)} → ${fmt(range.to)}`;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  disablePastDates = false,
  ariaLabel,
  className,
  id,
}: DateRangePickerProps) {
  const label = formatRange(value);
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {label || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={fr}
          selected={value}
          onSelect={onChange}
          numberOfMonths={1}
          disabled={disablePastDates ? { before: today } : undefined}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}
