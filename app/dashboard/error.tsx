"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // TODO Sentry (story 13.3) — pour l'instant on log côté client uniquement.
    console.error("[dashboard/error] ", error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Une erreur est survenue"
      description="Nous n'avons pas pu charger ce contenu. Réessayez dans un instant."
      action={
        <Button onClick={() => reset()} variant="outline">
          Réessayer
        </Button>
      }
    />
  );
}
