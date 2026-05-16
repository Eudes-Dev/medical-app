import { HelpCircle } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function HelpPage() {
  return (
    <PlaceholderPage
      title="Aide & Support"
      description="Documentation, raccourcis et contact support."
      icon={HelpCircle}
      features={[
        {
          title: "Documentation utilisateur",
          description: "Guides d'utilisation pas à pas pour chaque module.",
        },
        {
          title: "Raccourcis clavier",
          description: "Liste des raccourcis pour gagner en productivité.",
        },
        {
          title: "Contact support",
          description: "Ouvrir un ticket ou contacter l'équipe technique.",
        },
        {
          title: "Statut système",
          description: "État des services et incidents en cours.",
          storyId: "13.3",
        },
        {
          title: "Version de l'application",
          description: "Numéro de version et changelog récent.",
        },
      ]}
    />
  );
}
