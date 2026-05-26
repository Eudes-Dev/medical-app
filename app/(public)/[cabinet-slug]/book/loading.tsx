import { Skeleton } from "@/components/ui/skeleton";

export default function BookLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement du calendrier de réservation"
      className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col gap-6 px-5 py-9"
    >
      <span className="sr-only">Chargement en cours…</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-2 h-48 w-full rounded-2xl" />
    </div>
  );
}
