/**
 * Fallback global du segment `dashboard` (story 5.1, AC 4, 11).
 * Évite le flash blanc lors des transitions de page.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement de la page"
      className="flex min-h-screen w-full flex-col gap-4 p-6"
    >
      <span className="sr-only">Chargement en cours…</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="mt-4 h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
