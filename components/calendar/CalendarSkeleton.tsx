/**
 * CalendarSkeleton — fallback de chargement pour l'agenda (story 5.1, AC 1, 11).
 *
 * Reproduit la grille `CalendarGrid` : colonne d'heures (64px) + 7 colonnes
 * jours, en-tête + 14 lignes horaires (8h → 20h, créneaux d'1h). Animation
 * `animate-pulse` Tailwind. `role="status"` + `aria-label` + texte `sr-only`
 * pour l'accessibilité.
 *
 * NB : la rev 1.2 de la story demandait le Skeleton animate-ui ; ce composant
 * n'existe pas chez animate-ui (vérifié). On reste sur le Skeleton Shadcn
 * (`@/components/ui/skeleton`, animate-pulse natif) — divergence documentée.
 */

import { Skeleton } from "@/components/ui/skeleton";

const HEADER_COLUMNS = 7;
const HOURLY_ROWS = 14;

export function CalendarSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement de l'agenda"
      className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <span className="sr-only">Chargement en cours…</span>

      {/* Bandeau d'en-têtes de jours */}
      <div
        className="grid border-b border-border bg-card/95"
        style={{
          gridTemplateColumns: `64px repeat(${HEADER_COLUMNS}, 1fr)`,
        }}
      >
        <div className="border-r border-border" aria-hidden />
        {Array.from({ length: HEADER_COLUMNS }).map((_, i) => (
          <div
            key={i}
            className="border-r border-border last:border-r-0 px-3 py-2.5"
          >
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Corps : lignes horaires */}
      <div>
        {Array.from({ length: HOURLY_ROWS }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid border-b border-border/60 last:border-b-0"
            style={{
              gridTemplateColumns: `64px repeat(${HEADER_COLUMNS}, 1fr)`,
            }}
          >
            <div className="flex h-12 items-start justify-end pr-2 pt-1">
              <Skeleton className="h-3 w-8" />
            </div>
            {Array.from({ length: HEADER_COLUMNS }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-12 border-l border-border/40 p-1.5"
              >
                {/* On alterne pour évoquer la présence de RDV sans tout remplir */}
                {(rowIdx + colIdx) % 3 === 0 ? (
                  <Skeleton className="h-full w-full" />
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
