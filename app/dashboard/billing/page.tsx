import { CreditCard } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function BillingPage() {
  return (
    <PlaceholderPage
      title="Facturation"
      description="Acomptes, factures et exports comptables du cabinet."
      icon={CreditCard}
      features={[
        {
          title: "Acomptes Stripe",
          description:
            "Demander un acompte lors de la prise de RDV pour limiter les no-show.",
          storyId: "12.1",
        },
        {
          title: "Factures PDF",
          description: "Génération automatique des factures patient.",
          storyId: "12.2",
        },
        {
          title: "Encaissements & impayés",
          description: "Suivi des paiements reçus et relances automatiques.",
        },
        {
          title: "Exports comptables",
          description: "Export CSV/Excel pour la comptabilité.",
          storyId: "10.2",
        },
      ]}
    />
  );
}
