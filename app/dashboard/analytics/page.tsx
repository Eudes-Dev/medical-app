import { BarChart3 } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function AnalyticsPage() {
  return (
    <PlaceholderPage
      title="Statistiques"
      description="Indicateurs de performance et analyse de l'activité du cabinet."
      icon={BarChart3}
      features={[
        {
          title: "Chiffre d'affaires",
          description:
            "Suivi du CA quotidien, hebdomadaire et mensuel.",
          storyId: "10.1",
        },
        {
          title: "Fréquentation",
          description: "Nombre de RDV, nouveaux patients, taux de remplissage.",
          storyId: "10.1",
        },
        {
          title: "Taux de no-show",
          description: "Suivre les rendez-vous manqués et leurs motifs.",
          storyId: "10.1",
        },
        {
          title: "Types de soins demandés",
          description: "Répartition des consultations par type de soin.",
          storyId: "10.1",
        },
        {
          title: "Export CSV / Excel",
          description: "Téléchargement des données pour analyse externe.",
          storyId: "10.2",
        },
      ]}
    />
  );
}
