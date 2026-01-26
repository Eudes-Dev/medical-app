/**
 * Types TypeScript partagés pour l'application médicale.
 *
 * Ce fichier centralise les types et interfaces utilisés dans toute l'application.
 * Les types sont organisés par domaine métier.
 *
 * IMPORTANT: Ces types sont synchronisés avec le schéma Prisma (prisma/schema.prisma).
 * Lors de modifications du schéma, mettre à jour ce fichier en conséquence.
 *
 * Organisation:
 * - Types de base (User, Patient, Appointment, etc.) définis ici
 * - Types générés par Prisma disponibles dans @/lib/generated/prisma
 * - Types spécifiques aux composants dans leurs dossiers respectifs
 *
 * Note: Pour les opérations de base de données, préférez les types Prisma générés.
 * Ces types sont utiles pour les composants UI et les validations côté client.
 *
 * @module types
 * @see prisma/schema.prisma
 */

// ============================================
// USER (PRATICIEN)
// ============================================

/**
 * Représente le praticien (utilisateur) du cabinet médical.
 *
 * Ce type correspond au modèle User dans Prisma.
 * L'authentification est gérée séparément par Supabase Auth.
 *
 * @example
 * const user: User = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   email: "dr.dupont@cabinet.fr",
 *   name: "Dr. Marie Dupont",
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 */
export interface User {
  /** Identifiant unique (UUID) */
  id: string;
  /** Adresse email unique du praticien */
  email: string;
  /** Nom complet du praticien (ex: "Dr. Marie Dupont") */
  name: string;
  /** Date de création du compte */
  createdAt: Date;
  /** Date de dernière modification */
  updatedAt: Date;
}

// ============================================
// PATIENT
// ============================================

/**
 * Représente un patient du cabinet médical.
 *
 * Ce type correspond au modèle Patient dans Prisma.
 *
 * Champs optionnels:
 * - email: Optionnel car les patients "invités" peuvent réserver
 *   via le tunnel public sans fournir d'email
 * - dateOfBirth: Peut être renseigné ultérieurement
 * - notes: Informations complémentaires ajoutées par le praticien
 *
 * @example
 * const patient: Patient = {
 *   id: "uuid",
 *   firstName: "Jean",
 *   lastName: "Dupont",
 *   phone: "0612345678",
 *   email: "jean.dupont@email.com",
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 */
export interface Patient {
  /** Identifiant unique (UUID) */
  id: string;
  /** Prénom du patient */
  firstName: string;
  /** Nom de famille du patient */
  lastName: string;
  /** Numéro de téléphone (obligatoire pour contact) */
  phone: string;
  /** Adresse email (optionnelle - patients invités peuvent réserver sans) */
  email?: string;
  /** Date de naissance (optionnelle) */
  dateOfBirth?: Date;
  /** Notes médicales ou administratives (optionnelles) */
  notes?: string;
  /** Date de création du dossier */
  createdAt: Date;
  /** Date de dernière modification */
  updatedAt: Date;
}

/**
 * Patient avec ses rendez-vous associés.
 * Utilisé pour les vues détaillées du patient.
 */
export interface PatientWithAppointments extends Patient {
  /** Liste des rendez-vous du patient */
  appointments: Appointment[];
}

// ============================================
// RENDEZ-VOUS
// ============================================

/**
 * Statuts possibles d'un rendez-vous.
 *
 * IMPORTANT: Ces valeurs DOIVENT correspondre à l'enum Prisma AppointmentStatus.
 * Utiliser MAJUSCULES pour correspondre à l'enum Prisma.
 *
 * Cycle de vie typique:
 * PENDING → CONFIRMED → COMPLETED
 *        ↘ CANCELLED (à tout moment avant COMPLETED)
 *
 * Couleurs UI suggérées:
 * - PENDING: jaune (en attente de confirmation)
 * - CONFIRMED: vert (confirmé)
 * - CANCELLED: rouge (annulé)
 * - COMPLETED: gris (terminé)
 */
export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

/**
 * Mapping des statuts vers leurs labels français pour l'affichage UI.
 */
export const AppointmentStatusLabels: Record<AppointmentStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
};

/**
 * Mapping des statuts vers leurs couleurs CSS (Tailwind).
 */
export const AppointmentStatusColors: Record<AppointmentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-gray-100 text-gray-800",
};

/**
 * Représente un rendez-vous médical.
 *
 * Ce type correspond au modèle Appointment dans Prisma.
 *
 * Choix de conception:
 * - startTime/endTime plutôt que duration: Facilite les requêtes de
 *   conflits horaires et l'affichage dans un calendrier
 * - type: Permet de catégoriser les consultations
 * - status: Enum pour un typage fort et des transitions contrôlées
 *
 * @example
 * const appointment: Appointment = {
 *   id: "uuid",
 *   patientId: "patient-uuid",
 *   startTime: new Date("2026-01-27T09:00:00"),
 *   endTime: new Date("2026-01-27T09:30:00"),
 *   status: "CONFIRMED",
 *   type: "Consultation de suivi",
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 */
export interface Appointment {
  /** Identifiant unique (UUID) */
  id: string;
  /** ID du patient associé */
  patientId: string;
  /** Date et heure de début */
  startTime: Date;
  /** Date et heure de fin */
  endTime: Date;
  /** Statut du rendez-vous */
  status: AppointmentStatus;
  /** Type de consultation (ex: "Première consultation", "Suivi", "Urgence") */
  type: string;
  /** Notes sur le rendez-vous (optionnelles) */
  notes?: string;
  /** Date de création */
  createdAt: Date;
  /** Date de dernière modification */
  updatedAt: Date;
}

/**
 * Rendez-vous avec les informations du patient associé.
 * Utilisé pour l'affichage dans le calendrier et les listes.
 */
export interface AppointmentWithPatient extends Appointment {
  /** Informations du patient associé */
  patient: Patient;
}

// ============================================
// CRÉNEAUX HORAIRES
// ============================================

/**
 * Représente un créneau horaire disponible.
 */
export interface TimeSlot {
  /** Date et heure de début */
  startTime: Date;
  /** Date et heure de fin */
  endTime: Date;
  /** Le créneau est-il disponible ? */
  isAvailable: boolean;
}

// ============================================
// TYPES UTILITAIRES
// ============================================

/**
 * Type générique pour les réponses paginées de l'API.
 */
export interface PaginatedResponse<T> {
  /** Liste des éléments */
  data: T[];
  /** Nombre total d'éléments */
  total: number;
  /** Page actuelle (1-indexed) */
  page: number;
  /** Nombre d'éléments par page */
  pageSize: number;
  /** Nombre total de pages */
  totalPages: number;
}

/**
 * Type pour les erreurs API standardisées.
 */
export interface ApiError {
  /** Code d'erreur */
  code: string;
  /** Message d'erreur lisible */
  message: string;
  /** Détails additionnels (optionnel) */
  details?: Record<string, unknown>;
}
