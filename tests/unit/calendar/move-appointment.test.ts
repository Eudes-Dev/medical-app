/**
 * Tests de l'orchestration `moveAppointment` (Story 8.2 — QA fix TEST-002).
 *
 * Couvre les branches non testées au niveau composant :
 * - **No-op** sur créneau identique → aucun appel serveur, aucun toast (AC 4).
 * - **Exception** réseau (updateAppointment rejette) → revert + `errors.server` (AC 6).
 * - Succès (confirmation + toast) et échec métier (`{ success:false }` → revert).
 *
 * On mocke la Server Action et les toasts ; `getSlotStartTime` / `isSameSlot`
 * restent réels (logique de calcul vérifiée de bout en bout).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { moveAppointment } from "@/app/dashboard/calendar/move-appointment";
import { getSlotStartTime } from "@/components/calendar/CalendarGrid";
import type { Appointment, AppointmentWithPatient } from "@/types";

const updateAppointmentMock = vi.fn();
vi.mock("@/app/dashboard/calendar/actions", () => ({
  updateAppointment: (...args: unknown[]) => updateAppointmentMock(...args),
}));

const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();
vi.mock("@/lib/ui/toast", () => ({
  showSuccess: (...a: unknown[]) => showSuccessMock(...a),
  showError: (...a: unknown[]) => showErrorMock(...a),
}));

const CACHE_KEY = "view-key";

function makeAppointment(
  overrides: Partial<AppointmentWithPatient> = {},
): AppointmentWithPatient {
  return {
    id: "apt-1",
    patientId: "pat-1",
    startTime: new Date(2026, 5, 4, 10, 0), // slot 4
    endTime: new Date(2026, 5, 4, 10, 30), // 30 min
    status: "CONFIRMED",
    type: "Suivi",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    patient: { id: "pat-1", firstName: "Marie", lastName: "Durand" },
    ...overrides,
  } as AppointmentWithPatient;
}

/** Faux store en mémoire reproduisant l'API get/set du store calendrier. */
function makeStore(apt: AppointmentWithPatient) {
  const data: Record<string, AppointmentWithPatient[]> = { [CACHE_KEY]: [apt] };
  return {
    data,
    getAppointments: (k: string): Appointment[] | null => data[k] ?? null,
    setAppointments: vi.fn((k: string, list: Appointment[]) => {
      data[k] = list as AppointmentWithPatient[];
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("moveAppointment (Story 8.2)", () => {
  it("AC 4 — no-op sur créneau identique : aucun appel serveur, aucun toast, cache intact", async () => {
    const apt = makeAppointment(); // 4 juin, slot 4
    const store = makeStore(apt);

    await moveAppointment({
      appointment: apt,
      day: new Date(2026, 5, 4),
      slotIndex: 4, // identique à l'origine
      cacheKey: CACHE_KEY,
      getAppointments: store.getAppointments,
      setAppointments: store.setAppointments,
    });

    expect(updateAppointmentMock).not.toHaveBeenCalled();
    expect(store.setAppointments).not.toHaveBeenCalled();
    expect(showSuccessMock).not.toHaveBeenCalled();
    expect(showErrorMock).not.toHaveBeenCalled();
    expect(store.data[CACHE_KEY][0].startTime.getTime()).toBe(
      new Date(2026, 5, 4, 10, 0).getTime(),
    );
  });

  it("succès : optimiste → updateAppointment(startTime) → confirmation + toast 'déplacé'", async () => {
    const apt = makeAppointment();
    const store = makeStore(apt);
    const targetDay = new Date(2026, 5, 5);
    const targetSlot = 6; // 11h00
    const confirmed = makeAppointment({
      id: "apt-1",
      startTime: getSlotStartTime(targetDay, targetSlot),
      endTime: new Date(getSlotStartTime(targetDay, targetSlot).getTime() + 30 * 60000),
    });
    updateAppointmentMock.mockResolvedValue({ success: true, appointment: confirmed });

    await moveAppointment({
      appointment: apt,
      day: targetDay,
      slotIndex: targetSlot,
      cacheKey: CACHE_KEY,
      getAppointments: store.getAppointments,
      setAppointments: store.setAppointments,
    });

    expect(updateAppointmentMock).toHaveBeenCalledWith("apt-1", {
      startTime: getSlotStartTime(targetDay, targetSlot),
    });
    // 1er set = optimiste, 2e set = confirmation avec le RDV renvoyé.
    expect(store.setAppointments).toHaveBeenCalledTimes(2);
    expect(store.data[CACHE_KEY][0]).toBe(confirmed);
    expect(showSuccessMock).toHaveBeenCalledWith("Rendez-vous déplacé.");
    expect(showErrorMock).not.toHaveBeenCalled();
  });

  it("AC 5 — échec métier { success:false } : revert + toast avec le message renvoyé", async () => {
    const apt = makeAppointment();
    const store = makeStore(apt);
    updateAppointmentMock.mockResolvedValue({
      success: false,
      error: "Ce créneau est déjà occupé (Jean Martin). Choisissez un autre horaire.",
    });

    await moveAppointment({
      appointment: apt,
      day: new Date(2026, 5, 5),
      slotIndex: 6,
      cacheKey: CACHE_KEY,
      getAppointments: store.getAppointments,
      setAppointments: store.setAppointments,
    });

    expect(showErrorMock).toHaveBeenCalledWith(
      "Ce créneau est déjà occupé (Jean Martin). Choisissez un autre horaire.",
    );
    // Dernier set = restauration de la liste d'origine.
    expect(store.data[CACHE_KEY][0].startTime.getTime()).toBe(
      new Date(2026, 5, 4, 10, 0).getTime(),
    );
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  it("AC 6 — exception réseau : revert vers l'état précédent + toast errors.server", async () => {
    const apt = makeAppointment();
    const store = makeStore(apt);
    updateAppointmentMock.mockRejectedValue(new Error("network down"));

    await moveAppointment({
      appointment: apt,
      day: new Date(2026, 5, 5),
      slotIndex: 6,
      cacheKey: CACHE_KEY,
      getAppointments: store.getAppointments,
      setAppointments: store.setAppointments,
    });

    expect(showErrorMock).toHaveBeenCalledWith(
      "Une erreur est survenue. Merci de réessayer.",
    );
    // La liste a été restaurée : startTime d'origine.
    expect(store.data[CACHE_KEY][0].startTime.getTime()).toBe(
      new Date(2026, 5, 4, 10, 0).getTime(),
    );
    expect(showSuccessMock).not.toHaveBeenCalled();
  });
});
