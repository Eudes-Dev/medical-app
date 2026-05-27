/**
 * Catalogue centralisé des messages de toast en français.
 *
 * Toute chaîne affichée à l'utilisateur via `lib/ui/toast` doit transiter par
 * cet objet pour garantir la cohérence du wording (story 5.1, AC 5/6/7).
 */
export const TOAST_MESSAGES = {
  patient: {
    created: "Patient créé avec succès.",
    updated: "Patient mis à jour avec succès.",
    deleted: "Patient supprimé avec succès.",
  },
  appointment: {
    created: "Rendez-vous créé.",
    updated: "Rendez-vous modifié.",
    cancelled: "Rendez-vous annulé.",
    deleted: "Rendez-vous supprimé.",
    statusUpdated: "Statut du rendez-vous mis à jour.",
  },
  booking: {
    confirmed: "Rendez-vous confirmé !",
  },
  schedule: {
    saved: "Horaires enregistrés.",
  },
  errors: {
    validation: "Vérifiez les informations saisies.",
    slotTaken: "Ce créneau vient d'être réservé. Merci d'en choisir un autre.",
    server: "Une erreur est survenue. Merci de réessayer.",
    unauthorized: "Votre session a expiré. Reconnectez-vous.",
    badRequest: "La demande est invalide.",
  },
} as const;
