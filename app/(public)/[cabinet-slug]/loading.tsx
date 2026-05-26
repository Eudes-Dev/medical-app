import { Skeleton } from "@/components/ui/skeleton";

export default function CabinetPublicLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement de la page cabinet"
      className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col gap-6 px-5 py-9"
    >
      <span className="sr-only">Chargement en cours…</span>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
