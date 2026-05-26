"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PatientDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[dashboard/patients/[id]/error] ", error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Impossible d'afficher la fiche patient"
      description="Une erreur est survenue lors du chargement des informations."
      action={
        <Button onClick={() => reset()} variant="outline">
          Réessayer
        </Button>
      }
    />
  );
}
