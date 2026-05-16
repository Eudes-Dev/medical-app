import { Clock } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function WaitlistPage() {
  return (
    <PlaceholderPage
      title="Liste d'attente"
      description="Patients en attente d'un créneau, avec proposition automatique en cas d'annulation."
      icon={Clock}
      features={[
        {
          title: "File d'attente priorisée",
          description:
            "Ajouter un patient à la liste avec motif et niveau d'urgence.",
          storyId: "8.5",
        },
        {
          title: "Proposition automatique",
          description:
            "Suggérer un créneau libéré aux patients en attente compatibles.",
          storyId: "8.5",
        },
        {
          title: "Notifications",
          description: "Envoi email/SMS lors d'une proposition de créneau.",
          storyId: "6.2",
        },
        {
          title: "Historique",
          description: "Suivre les conversions liste d'attente → RDV.",
        },
      ]}
    />
  );
}
