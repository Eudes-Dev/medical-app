"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BookError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[(public)/[cabinet-slug]/book/error] ", error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Impossible de charger le calendrier"
      description="Une erreur est survenue lors du chargement des créneaux disponibles."
      action={
        <Button onClick={() => reset()} variant="outline">
          Réessayer
        </Button>
      }
    />
  );
}
