/**
 * Types TypeScript partagés pour l'application médicale.
 *
 * Ce fichier centralise les types et interfaces utilisés dans toute l'application.
 * Les types sont organisés par domaine métier.
 *
 * Organisation:
 * - Types de base (Patient, Appointment, etc.) définis ici
 * - Types spécifiques aux composants dans leurs dossiers respectifs
 * - Types d'API dans /types/api.ts (à créer)
 *
 * @module types
 */

// ============================================
// PATIENT
// ============================================

/**
 * Représente un patient du cabinet médical.
 *
 * @example
 * const patient: Patient = {
 *   id: "uuid",
 *   firstName: "Jean",
 *   lastName: "Dupont",
 *   email: "jean.dupont@email.com",
 *   phone: "0612345678",
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
  /** Adresse email (optionnelle) */
  email?: string;
  /** Numéro de téléphone */
  phone: string;
  /** Date de naissance (optionnelle) */
  dateOfBirth?: Date;
  /** Notes médicales (optionnelles) */
  notes?: string;
  /** Date de création du dossier */
  createdAt: Date;
  /** Date de dernière modification */
  updatedAt: Date;
}

// ============================================
// RENDEZ-VOUS
// ============================================

/**
 * Statuts possibles d'un rendez-vous.
 *
 * - confirmed: Rendez-vous confirmé (vert)
 * - pending: En attente de confirmation (jaune)
 * - cancelled: Annulé (rouge)
 * - completed: Terminé (gris)
 */
export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

/**
 * Représente un rendez-vous médical.
 *
 * @example
 * const appointment: Appointment = {
 *   id: "uuid",
 *   patientId: "patient-uuid",
 *   startTime: new Date("2026-01-27T09:00:00"),
 *   endTime: new Date("2026-01-27T09:30:00"),
 *   status: "confirmed",
 *   type: "Consultation générale",
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
  /** Type de consultation */
  type: string;
  /** Notes sur le rendez-vous (optionnelles) */
  notes?: string;
  /** Date de création */
  createdAt: Date;
  /** Date de dernière modification */
  updatedAt: Date;
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
