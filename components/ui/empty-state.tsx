import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * EmptyState — composant générique pour signaler l'absence de données ou un
 * état d'erreur récupérable (story 5.1, AC 8/9).
 *
 * Server Component-safe : aucune dépendance client. Réutilisé dans les listes
 * vides (patients, calendrier, créneaux) et dans les `error.tsx` / `not-found.tsx`.
 */

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Taille de l'icône utilitaire (défaut : 12) */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center text-center py-12 px-4" +
        (className ? ` ${className}` : "")
      }
    >
      <Icon className="h-12 w-12 text-slate-400" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-medium text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
