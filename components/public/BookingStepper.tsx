/**
 * Indicateur d'étape (3 étapes) du tunnel de réservation publique.
 *
 * Stories 4.1 → 4.2 → 4.3 :
 *   1. Créneau    → /[slug]/book
 *   2. Vos infos  → /[slug]/book/guest
 *   3. Confirmation → /[slug]/book/success
 *
 * A11y: `<ol>` ordonnée + `aria-current="step"` sur l'étape active.
 *
 * @module components/public/BookingStepper
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStep = 1 | 2 | 3;

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 1, label: "Créneau" },
  { id: 2, label: "Vos infos" },
  { id: 3, label: "Confirmation" },
];

interface BookingStepperProps {
  current: BookingStep;
  className?: string;
}


export function BookingStepper({ current, className }: BookingStepperProps) {
  const progressPct = ((current - 1) / (STEPS.length - 1)) * 100;

  return (
    <ol
      aria-label="Progression de la réservation"
      className={cn(
        "relative grid grid-cols-3 w-full max-w-4xl mx-auto gap-2  bg-white/70 px-5 py-[18px] backdrop-blur-md md:px-8 md:py-[22px]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-5 bottom-4 left-5 h-[3px] overflow-hidden rounded-full bg-slate-200 md:right-8 md:bottom-[18px] md:left-8"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {STEPS.map((step) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex min-h-[44px] items-center gap-2.5 px-0.5 pt-1 pb-[18px] text-[13px] font-medium tracking-[-0.01em]",
              active && "text-slate-900",
              done && "text-slate-700",
              !active && !done && "text-slate-400",
            )}
          >
            <span
              className={cn(
                "inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white text-xs font-semibold tabular-nums transition-all",
                active &&
                  "border-blue-600 bg-blue-600 text-white shadow-[0_0_0_4px_var(--color-blue-100,#dbeafe)]",
                done && "border-blue-600 bg-blue-600 text-white",
                !active && !done && "border-slate-200 text-slate-400",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.id}
            </span>
            <span className="truncate">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
