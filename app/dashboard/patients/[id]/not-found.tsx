import Link from "next/link";
import { UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function PatientNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Patient introuvable"
      description="Ce patient n'existe pas ou a été supprimé."
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard/patients">Retour à la liste</Link>
        </Button>
      }
    />
  );
}
