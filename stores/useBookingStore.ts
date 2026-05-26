/**
 * Store Zustand pour le tunnel de réservation publique (Stories 4.1, 4.2).
 *
 * Conserve le créneau sélectionné par le patient invité entre les étapes
 * 1 (sélection) → 2 (formulaire invité) → 3 (confirmation).
 *
 * Séparé volontairement de `useCalendarStore` (UI agenda praticien) pour
 * éviter le couplage des deux contextes.
 *
 * Persistance: `sessionStorage` (le tunnel ne doit pas survivre à la fermeture
 * du navigateur). La `Date` est sérialisée en ISO string et restaurée à la lecture.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = "booking-state";
const SLOT_ISO_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

export interface BookingState {
  /** Créneau sélectionné (Date : jour + heure de début). `null` si aucun. */
  selectedSlot: Date | null;
  /**
   * ID du dernier rendez-vous créé. Sert de fallback côté client si le cookie
   * `booking_token` n'est pas encore lisible juste après la redirection.
   */
  lastAppointmentId: string | null;
  /** Définit le créneau sélectionné. Passer `null` pour effacer la sélection. */
  setSelectedSlot: (slot: Date | null) => void;
  /** Mémorise l'identifiant du RDV juste créé. */
  setLastAppointmentId: (id: string | null) => void;
  /** Réinitialise complètement le store (utile en fin de tunnel). */
  reset: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      selectedSlot: null,
      lastAppointmentId: null,
      setSelectedSlot: (slot) => set({ selectedSlot: slot }),
      setLastAppointmentId: (id) => set({ lastAppointmentId: id }),
      reset: () => set({ selectedSlot: null, lastAppointmentId: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.sessionStorage : (undefined as unknown as Storage),
      ),
      // Restaure le type Date après désérialisation JSON (qui produit une string).
      onRehydrateStorage: () => (state) => {
        if (
          state?.selectedSlot &&
          typeof state.selectedSlot === "string" &&
          SLOT_ISO_REGEX.test(state.selectedSlot)
        ) {
          state.selectedSlot = new Date(state.selectedSlot);
        }
      },
    },
  ),
);
