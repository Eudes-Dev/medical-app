"use client";

/**
 * Sélecteur de motif de consultation pour le tunnel public (story 7.3, AC 3/10).
 *
 * Liste les services `active && isPublic` sous forme de cartes radio
 * (libellé, durée, tarif si renseigné, description). Navigable au clavier.
 * N'est rendu par `BookingCalendar` que lorsqu'au moins un service public
 * existe (sinon repli implicite côté serveur).
 *
 * @module components/public/ServiceSelector
 */

import { Check, Clock } from "lucide-react";

import type { PublicServiceDTO } from "@/app/dashboard/settings/services/actions";
import { cn } from "@/lib/utils";

interface ServiceSelectorProps {
  services: PublicServiceDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest}`;
}

export function ServiceSelector({
  services,
  selectedId,
  onSelect,
}: ServiceSelectorProps) {
  const onKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onSelect(services[Math.min(index + 1, services.length - 1)].id);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onSelect(services[Math.max(index - 1, 0)].id);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Choisir un motif de consultation"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
    >
      {services.map((service, index) => {
        const selected = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!selectedId && index === 0) ? 0 : -1}
            onClick={() => onSelect(service.id)}
            onKeyDown={(e) => onKey(e, index)}
            className={cn(
              "group relative flex flex-col gap-1 rounded-2xl border-[1.5px] p-4 text-left transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              selected
                ? "border-blue-600 bg-blue-50/60 shadow-[0_8px_22px_-12px_rgba(37,99,235,0.4)]"
                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.005em] text-slate-900">
                {service.label}
              </span>
              {selected && (
                <span
                  aria-hidden
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="size-3.5" aria-hidden />
                {durationLabel(service.durationMin)}
              </span>
              {service.price != null && (
                <span className="font-medium text-slate-700 tabular-nums">
                  {priceFormatter.format(service.price)}
                </span>
              )}
            </div>
            {service.description && (
              <p className="mt-0.5 text-[13px] leading-snug text-slate-500 text-pretty">
                {service.description}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
