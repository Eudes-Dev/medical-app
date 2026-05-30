"use client";

/**
 * Sélecteur de couleur accessible pour un type de soin (story 7.3, AC 10).
 *
 * 8 pastilles présentées comme un `radiogroup` : navigation clavier (flèches),
 * `aria-label` de couleur sur chaque option, focus visible. La valeur est
 * l'identifiant de palette (`ServiceColor.id`), persisté tel quel en base.
 *
 * @module components/settings/color-picker
 */

import { SERVICE_COLORS } from "@/lib/cabinet/service-colors";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ColorPickerProps {
  /** Identifiant de couleur sélectionné. */
  value: string;
  onChange: (id: string) => void;
  /** `id` du label associé (relié via `aria-labelledby`). */
  labelId?: string;
  disabled?: boolean;
}

export function ColorPicker({
  value,
  onChange,
  labelId,
  disabled,
}: ColorPickerProps) {
  const handleKey = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = SERVICE_COLORS[(index + 1) % SERVICE_COLORS.length];
      onChange(next.id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev =
        SERVICE_COLORS[
          (index - 1 + SERVICE_COLORS.length) % SERVICE_COLORS.length
        ];
      onChange(prev.id);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : "Couleur du type de soin"}
      className="flex flex-wrap gap-2"
    >
      {SERVICE_COLORS.map((color, index) => {
        const selected = color.id === value;
        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            tabIndex={selected || (!value && index === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(color.id)}
            onKeyDown={(e) => handleKey(e, index)}
            className={cn(
              // Cible tactile ≥ 44px (WCAG 2.5.8) avec pastille visuelle de 28px.
              "flex size-11 items-center justify-center rounded-full transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-white shadow-sm transition-transform",
                color.dot,
                selected
                  ? "ring-2 ring-offset-2 ring-foreground/40 scale-110"
                  : "hover:scale-105",
              )}
            >
              {selected && <Check className="size-4" aria-hidden />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
