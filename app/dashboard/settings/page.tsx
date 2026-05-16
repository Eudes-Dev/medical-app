import { Settings } from "lucide-react";

import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Paramètres"
      description="Configuration du cabinet, du compte praticien et des intégrations."
      icon={Settings}
      mvp
      features={[
        {
          title: "Profil cabinet public",
          description: "Présentation, photos, adresse, accès.",
          storyId: "7.4",
        },
        {
          title: "Horaires d'ouverture",
          description: "Définir les plages de disponibilité hebdomadaires.",
          storyId: "7.1",
        },
        {
          title: "Congés & jours fériés",
          description: "Bloquer des journées entières dans l'agenda.",
          storyId: "7.2",
        },
        {
          title: "Types de soins",
          description: "Configurer durée, tarif et couleur par type de soin.",
          storyId: "7.3",
        },
        {
          title: "Compte praticien",
          description: "Profil, mot de passe, double authentification.",
        },
        {
          title: "Notifications",
          description: "Préférences email et SMS.",
        },
        {
          title: "Intégrations",
          description: "Google Calendar, import Doctolib.",
          storyId: "18.2 / 18.3",
        },
        {
          title: "Langue",
          description: "Bascule FR / EN de l'interface.",
          storyId: "15.1",
        },
        {
          title: "RGPD & Sécurité",
          description: "Journal d'audit, chiffrement des données.",
          storyId: "11.3 / 11.4",
        },
        {
          title: "Facturation Stripe",
          description: "Clés API, TVA, mentions légales sur factures.",
        },
      ]}
    />
  );
}
