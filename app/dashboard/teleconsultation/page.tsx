import { Video } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function TeleconsultationPage() {
  return (
    <PlaceholderPage
      title="Téléconsultation"
      description="Salle virtuelle pour les consultations à distance."
      icon={Video}
      features={[
        {
          title: "Salle visio intégrée",
          description: "Lancement d'une consultation vidéo sécurisée.",
          storyId: "16.1",
        },
        {
          title: "RDV visio du jour",
          description: "Liste des téléconsultations programmées.",
          storyId: "16.1",
        },
        {
          title: "Lien d'invitation patient",
          description: "Génération et envoi du lien sécurisé au patient.",
          storyId: "16.1",
        },
        {
          title: "Notes de consultation",
          description: "Prise de notes en parallèle de la visio.",
          storyId: "9.1",
        },
      ]}
    />
  );
}
