import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function CabinetNotFound() {
  return (
    <EmptyState
      icon={Building2}
      title="Cabinet introuvable"
      description="L'adresse demandée ne correspond à aucun cabinet."
    />
  );
}
