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
    moved: "Rendez-vous déplacé.",
    cancelled: "Rendez-vous annulé.",
    deleted: "Rendez-vous supprimé.",
    statusUpdated: "Statut du rendez-vous mis à jour.",
    // Story 8.4 — séries de rendez-vous récurrents. Le détail chiffré
    // (« 4 créés, 2 ignorés ») est composé côté composant à partir du résumé.
    seriesCreated: "Série de rendez-vous créée.",
    seriesCancelled: "Série annulée.",
    seriesDeleted: "Série supprimée.",
  },
  booking: {
    confirmed: "Rendez-vous confirmé !",
    rescheduled: "Rendez-vous reprogrammé.",
    tooLate:
      "Ce rendez-vous est trop proche pour être modifié en ligne. Merci de contacter le cabinet.",
  },
  schedule: {
    saved: "Horaires enregistrés.",
  },
  cabinetProfile: {
    saved: "Profil du cabinet enregistré.",
  },
  timeOff: {
    created: "Exception ajoutée.",
    deleted: "Exception supprimée.",
    holidayEnabled: "Jour férié activé.",
    holidayDisabled: "Jour férié désactivé.",
    cancellationsSent: "Patients prévenus par email.",
  },
  serviceType: {
    created: "Type de soin créé.",
    updated: "Type de soin mis à jour.",
    deleted: "Type de soin supprimé.",
    archived: "Type de soin archivé.",
    restored: "Type de soin réactivé.",
    hasAppointments:
      "Ce type de soin est utilisé par des rendez-vous : archivez-le plutôt que de le supprimer.",
  },
  // Story 8.5 — liste d'attente. Les comptes dynamiques (« 2 patients en attente
  // pour ce créneau ») sont composés côté composant (pas de clé par valeur).
  waitlist: {
    added: "Patient ajouté à la liste d'attente.",
    removed: "Patient retiré de la liste d'attente.",
    scheduled: "Rendez-vous programmé depuis la liste d'attente.",
  },
  errors: {
    validation: "Vérifiez les informations saisies.",
    slotTaken: "Ce créneau vient d'être réservé. Merci d'en choisir un autre.",
    server: "Une erreur est survenue. Merci de réessayer.",
    unauthorized: "Votre session a expiré. Reconnectez-vous.",
    badRequest: "La demande est invalide.",
    rateLimited: "Trop de tentatives. Merci de réessayer dans quelques minutes.",
  },
} as const;
