import { MessageSquare } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function CommunicationPage() {
  return (
    <PlaceholderPage
      title="Communication"
      description="Emails, SMS et rappels automatiques envoyés aux patients."
      icon={MessageSquare}
      features={[
        {
          title: "Emails transactionnels",
          description: "Confirmations de RDV, annulations, récapitulatifs.",
          storyId: "6.1",
        },
        {
          title: "Rappels automatiques",
          description:
            "Configurer les rappels J-1, J-2 et personnaliser les templates.",
          storyId: "6.2",
        },
        {
          title: "Notifications SMS",
          description: "Envoi de SMS de confirmation et de rappel.",
          storyId: "6.3",
        },
        {
          title: "Journal d'envois",
          description: "Historique complet des communications avec statut.",
        },
      ]}
    />
  );
}
