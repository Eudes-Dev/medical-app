/**
 * Skeleton de chargement de la page horaires (story 7.1, AC 7).
 * Affiché pendant le chargement initial / la navigation.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement des horaires"
      className="flex min-h-screen w-full flex-col gap-4 p-6"
    >
      <span className="sr-only">Chargement en cours…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
