"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CabinetPublicError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[(public)/[cabinet-slug]/error] ", error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Une erreur est survenue"
      description="Nous n'avons pas pu charger cette page. Réessayez dans un instant."
      action={
        <Button onClick={() => reset()} variant="outline">
          Réessayer
        </Button>
      }
    />
  );
}
