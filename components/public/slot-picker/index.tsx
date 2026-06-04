"use client";

/**
 * Sous-composants présentationnels du sélecteur de créneaux (story 8.1).
 *
 * Extraits de `BookingCalendar.tsx` (story 4.1) pour être **réutilisés sans
 * duplication** par le tunnel de réservation ET le flux de reprogrammation
 * (`RescheduleFlow.tsx`). Volontairement **sans dépendance au store** Zustand :
 * l'état (date/créneau sélectionné) est passé par props, ce qui les rend
 * partageables entre un flux piloté par store et un flux à état local.
 *
 * @module components/public/slot-picker
 */

import { useEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rail de dates horizontal (cards 78×96) avec snap, scroll et navigation clavier. */
export function DateRail({
  days,
  today,
  selected,
  onSelect,
}: {
  days: Date[];
  today: Date;
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = railRef.current;
    if (!r) return;
    const el = r.querySelector<HTMLElement>('[aria-checked="true"]');
    if (el) {
      r.scrollLeft = el.offsetLeft - r.clientWidth / 2 + el.offsetWidth / 2;
    }
  }, []);

  const scrollBy = (delta: number) => {
    railRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onSelect(days[Math.min(i + 1, days.length - 1)]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onSelect(days[Math.max(i - 1, 0)]);
    }
  };

  return (
    <div className="relative -mx-5 md:-mx-2">
      <button
        type="button"
        aria-label="Jours précédents"
        onClick={() => scrollBy(-260)}
        className="absolute top-1/2 -left-3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.04)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 md:inline-flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={railRef}
        role="radiogroup"
        aria-label="Choisir une date"
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {days.map((d, i) => {
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="radio"
              aria-checked={isSel}
              tabIndex={isSel ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => onSelect(d)}
              className={cn(
                "relative flex h-[96px] w-[78px] shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] px-1 py-2.5 transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                isSel
                  ? "scale-[1.03] border-blue-600 bg-blue-600 text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,0.45),0_2px_6px_-2px_rgba(37,99,235,0.3)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold tracking-[0.08em] uppercase",
                  isSel ? "text-white" : "text-slate-500",
                )}
              >
                {format(d, "EEE", { locale: fr })}
              </span>
              <span
                className={cn(
                  "text-[26px] leading-none font-semibold tracking-[-0.025em] tabular-nums",
                  isSel ? "text-white" : "text-slate-900",
                )}
              >
                {format(d, "d")}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium lowercase",
                  isSel ? "text-white/75" : "text-slate-400",
                )}
              >
                {format(d, "MMM", { locale: fr })}
              </span>
              {isToday && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-[7px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full",
                    isSel ? "bg-white" : "bg-blue-600",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Jours suivants"
        onClick={() => scrollBy(260)}
        className="absolute top-1/2 -right-3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.04)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 md:inline-flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Section collapsible regroupant des créneaux (Matin / Après-midi). */
export function SlotSection({
  icon,
  label,
  count,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
          open && "border-b border-slate-100",
        )}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-[-0.005em] text-slate-900">{label}</span>
        <span className="ml-0.5 text-[12.5px] tabular-nums text-slate-500">
          {count} {count > 1 ? "créneaux" : "créneau"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-slate-400 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div
          role="radiogroup"
          aria-label={label}
          className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:gap-2.5"
        >
          {children}
        </div>
      )}
    </section>
  );
}

/** Grille de créneaux horaires sélectionnables. */
export function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: Date[];
  selected: Date | null;
  onSelect: (s: Date) => void;
}) {
  return (
    <>
      {slots.map((s) => {
        const isSel = selected !== null && s.getTime() === selected.getTime();
        return (
          <button
            key={s.toISOString()}
            type="button"
            role="radio"
            aria-checked={isSel}
            onClick={() => onSelect(s)}
            className={cn(
              "h-12 min-w-[88px] rounded-xl border-[1.5px] text-sm font-semibold tracking-[-0.005em] tabular-nums transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.97]",
              isSel
                ? "border-blue-600 bg-blue-600 text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,0.45),0_2px_6px_-2px_rgba(37,99,235,0.3)]"
                : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
            )}
          >
            {format(s, "HH:mm")}
          </button>
        );
      })}
    </>
  );
}

/** Squelette de chargement d'une section de créneaux. */
export function SkeletonSection({
  icon,
  label,
  n,
}: {
  icon: React.ReactNode;
  label: string;
  n: number;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <span className="ml-0.5 text-[12.5px] text-slate-500">— créneaux</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:gap-2.5">
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]"
          />
        ))}
      </div>
    </section>
  );
}
