"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CalendarError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[dashboard/calendar/error] ", error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Impossible d'afficher l'agenda"
      description="Une erreur est survenue lors du chargement des rendez-vous."
      action={
        <Button onClick={() => reset()} variant="outline">
          Réessayer
        </Button>
      }
    />
  );
}
