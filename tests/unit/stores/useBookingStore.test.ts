/**
 * Tests unitaires du store `useBookingStore` (Story 4.1).
 *
 * Vérifie:
 * - Sélection / désélection d'un créneau
 * - Réinitialisation
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useBookingStore } from "@/stores/useBookingStore";

const STORAGE_KEY = "booking-state";

describe("useBookingStore", () => {
  beforeEach(() => {
    // sessionStorage est polyfillé par tests/setup.ts via le même mécanisme
    // que localStorage. On purge la persistance entre les tests.
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    useBookingStore.setState({ selectedSlot: null, lastAppointmentId: null });
  });

  it("démarre sans créneau sélectionné", () => {
    expect(useBookingStore.getState().selectedSlot).toBeNull();
  });

  it("setSelectedSlot enregistre un créneau", () => {
    const slot = new Date("2026-06-01T09:00:00");
    useBookingStore.getState().setSelectedSlot(slot);
    expect(useBookingStore.getState().selectedSlot).toEqual(slot);
  });

  it("setSelectedSlot(null) efface la sélection", () => {
    useBookingStore
      .getState()
      .setSelectedSlot(new Date("2026-06-01T09:00:00"));
    useBookingStore.getState().setSelectedSlot(null);
    expect(useBookingStore.getState().selectedSlot).toBeNull();
  });

  it("reset() remet l'état initial", () => {
    useBookingStore
      .getState()
      .setSelectedSlot(new Date("2026-06-01T09:00:00"));
    useBookingStore.getState().setLastAppointmentId("apt-1");
    useBookingStore.getState().reset();
    expect(useBookingStore.getState().selectedSlot).toBeNull();
    expect(useBookingStore.getState().lastAppointmentId).toBeNull();
  });

  it("setLastAppointmentId mémorise et efface l'identifiant (Story 4.2)", () => {
    useBookingStore.getState().setLastAppointmentId("apt-uuid-42");
    expect(useBookingStore.getState().lastAppointmentId).toBe("apt-uuid-42");
    useBookingStore.getState().setLastAppointmentId(null);
    expect(useBookingStore.getState().lastAppointmentId).toBeNull();
  });
});
