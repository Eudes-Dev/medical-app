/**
 * Tests component/intégration du glisser-déposer de l'agenda (Story 8.2, Task 5).
 *
 * Couvre :
 * - AC 2 : un drag (mouvement > seuil) n'ouvre PAS le détail (onSelect) et émet
 *   `onMove` ; un clic simple (sans mouvement) ouvre le détail et n'émet pas de move.
 * - AC 1 : une carte CANCELLED/COMPLETED n'est pas déplaçable (onMove jamais émis).
 * - AC 4/5/6 : via `moveAppointment` câblé sur le drag, `updateAppointment` est
 *   appelée avec le bon `startTime` ; sur `{ success: false }` la liste en cache
 *   est restaurée et un toast d'erreur est émis.
 *
 * La géométrie DOM (`resolveDropTarget`) est mockée — jsdom ne calcule pas la
 * mise en page ; la fonction pure de mapping est testée dans drag-utils.test.ts.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AppointmentCard } from "@/components/calendar/AppointmentCard";
import { moveAppointment } from "@/app/dashboard/calendar/move-appointment";
import { getSlotStartTime } from "@/components/calendar/CalendarGrid";
import type * as DragUtils from "@/components/calendar/drag-utils";
import type { Appointment, AppointmentWithPatient } from "@/types";

// --- Mocks ----------------------------------------------------------------
// Server Action : on intercepte pour ne pas charger prisma/serveur et asserter
// les arguments.
const updateAppointmentMock = vi.fn();
vi.mock("@/app/dashboard/calendar/actions", () => ({
  updateAppointment: (...args: unknown[]) => updateAppointmentMock(...args),
}));

// Toasts centralisés.
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();
vi.mock("@/lib/ui/toast", () => ({
  showSuccess: (...a: unknown[]) => showSuccessMock(...a),
  showError: (...a: unknown[]) => showErrorMock(...a),
}));

// Géométrie de dépôt : on garde les helpers purs réels (isSameSlot…), on mocke
// uniquement la résolution DOM.
const resolveDropTargetMock = vi.fn();
vi.mock("@/components/calendar/drag-utils", async (orig) => {
  const actual = await orig<typeof DragUtils>();
  return {
    ...actual,
    resolveDropTarget: (...a: unknown[]) => resolveDropTargetMock(...a),
  };
});

// --- Fixtures -------------------------------------------------------------

function makeAppointment(
  overrides: Partial<AppointmentWithPatient> = {},
): AppointmentWithPatient {
  return {
    id: "apt-1",
    patientId: "pat-1",
    startTime: new Date(2026, 5, 4, 10, 0), // 4 juin 2026, 10h00 (slot 4)
    endTime: new Date(2026, 5, 4, 10, 30), // durée 30 min
    status: "CONFIRMED",
    type: "Suivi",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    patient: {
      id: "pat-1",
      firstName: "Marie",
      lastName: "Durand",
    },
    ...overrides,
  } as AppointmentWithPatient;
}

/** Fait suivre un geste pointeur complet sur l'élément. */
function dragPointer(
  el: Element,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  fireEvent.pointerDown(el, { clientX: from.x, clientY: from.y, button: 0, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: to.x, clientY: to.y, button: 0, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: to.x, clientY: to.y, button: 0, pointerId: 1 });
  // Le navigateur émet un click après le pointerup ; le composant doit le
  // neutraliser quand un drag a eu lieu (AC 2).
  fireEvent.click(el);
}

beforeAll(() => {
  // jsdom n'implémente pas PointerEvent : polyfill minimal basé sur MouseEvent
  // (qui porte clientX/clientY) pour que fireEvent transmette les coordonnées.
  if (typeof window.PointerEvent === "undefined") {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(type: string, props: PointerEventInit = {}) {
        super(type, props);
        this.pointerId = props.pointerId ?? 1;
      }
    }
    // @ts-expect-error — assignation du polyfill
    window.PointerEvent = PointerEventPolyfill;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Drag-and-drop agenda (Story 8.2)", () => {
  it("AC 2 : un drag émet onMove (jour + créneau) et n'ouvre pas le détail", () => {
    const onSelect = vi.fn();
    const onMove = vi.fn();
    const apt = makeAppointment();
    // Cible résolue : 5 juin, slot 6 (11h00).
    resolveDropTargetMock.mockReturnValue({
      day: new Date(2026, 5, 5),
      slotIndex: 6,
      column: document.createElement("div"),
    });

    render(<AppointmentCard appointment={apt} onSelect={onSelect} onMove={onMove} />);
    const card = screen.getByRole("button");

    dragPointer(card, { x: 10, y: 10 }, { x: 120, y: 200 });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(apt, new Date(2026, 5, 5), 6);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("AC 2 : un clic simple (sans mouvement) ouvre le détail et n'émet pas de move", () => {
    const onSelect = vi.fn();
    const onMove = vi.fn();
    const apt = makeAppointment();

    render(<AppointmentCard appointment={apt} onSelect={onSelect} onMove={onMove} />);
    const card = screen.getByRole("button");

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
    fireEvent.pointerUp(card, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
    fireEvent.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(apt);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("AC 2 : un dépôt hors zone (resolveDropTarget null) n'émet pas de move", () => {
    const onMove = vi.fn();
    const apt = makeAppointment();
    resolveDropTargetMock.mockReturnValue(null);

    render(<AppointmentCard appointment={apt} onMove={onMove} />);
    const card = screen.getByRole("button");
    dragPointer(card, { x: 10, y: 10 }, { x: 500, y: 900 });

    expect(onMove).not.toHaveBeenCalled();
  });

  it.each(["CANCELLED", "COMPLETED"] as const)(
    "AC 1 : une carte %s n'est pas déplaçable (onMove jamais émis, clic = détail)",
    (status) => {
      const onSelect = vi.fn();
      const onMove = vi.fn();
      const apt = makeAppointment({ status });
      resolveDropTargetMock.mockReturnValue({
        day: new Date(2026, 5, 5),
        slotIndex: 6,
        column: document.createElement("div"),
      });

      render(<AppointmentCard appointment={apt} onSelect={onSelect} onMove={onMove} />);
      const card = screen.getByRole("button");
      dragPointer(card, { x: 10, y: 10 }, { x: 120, y: 200 });

      expect(onMove).not.toHaveBeenCalled();
      // Le clic reste fonctionnel (ouverture du détail).
      expect(onSelect).toHaveBeenCalledWith(apt);
    },
  );

  describe("Persistance via moveAppointment (AC 4/5/6)", () => {
    const CACHE_KEY = "view-key";

    /**
     * Câble une carte sur le vrai `moveAppointment` avec un faux store en
     * mémoire. Le store est défini en portée de test (pas dans un composant)
     * pour rester mutable et lisible par les assertions.
     */
    function renderWithStore(appointment: AppointmentWithPatient) {
      const store: Record<string, AppointmentWithPatient[]> = {
        [CACHE_KEY]: [appointment],
      };
      const getAppointments = (k: string): Appointment[] | null => store[k] ?? null;
      const setAppointments = (k: string, list: Appointment[]) => {
        store[k] = list as AppointmentWithPatient[];
      };
      render(
        <AppointmentCard
          appointment={appointment}
          onMove={(apt, day, slotIndex) =>
            moveAppointment({
              appointment: apt,
              day,
              slotIndex,
              cacheKey: CACHE_KEY,
              getAppointments,
              setAppointments,
            })
          }
        />,
      );
      return store;
    }

    it("AC 4 : drag → updateAppointment appelée avec le bon startTime", async () => {
      const apt = makeAppointment();
      const targetDay = new Date(2026, 5, 5);
      const targetSlot = 6; // 11h00
      resolveDropTargetMock.mockReturnValue({
        day: targetDay,
        slotIndex: targetSlot,
        column: document.createElement("div"),
      });
      updateAppointmentMock.mockResolvedValue({
        success: true,
        appointment: makeAppointment({
          startTime: getSlotStartTime(targetDay, targetSlot),
          endTime: new Date(getSlotStartTime(targetDay, targetSlot).getTime() + 30 * 60000),
        }),
      });

      renderWithStore(apt);
      dragPointer(screen.getByRole("button"), { x: 10, y: 10 }, { x: 120, y: 200 });

      await waitFor(() => expect(updateAppointmentMock).toHaveBeenCalledTimes(1));
      expect(updateAppointmentMock).toHaveBeenCalledWith("apt-1", {
        startTime: getSlotStartTime(targetDay, targetSlot),
      });
      await waitFor(() => expect(showSuccessMock).toHaveBeenCalledWith("Rendez-vous déplacé."));
    });

    it("AC 5 : sur { success: false }, la liste en cache est restaurée + toast d'erreur", async () => {
      const apt = makeAppointment();
      resolveDropTargetMock.mockReturnValue({
        day: new Date(2026, 5, 5),
        slotIndex: 6,
        column: document.createElement("div"),
      });
      updateAppointmentMock.mockResolvedValue({
        success: false,
        error: "Ce créneau est déjà occupé (Jean Martin). Choisissez un autre horaire.",
      });

      const store = renderWithStore(apt);
      dragPointer(screen.getByRole("button"), { x: 10, y: 10 }, { x: 120, y: 200 });

      await waitFor(() => expect(showErrorMock).toHaveBeenCalled());
      expect(showErrorMock).toHaveBeenCalledWith(
        "Ce créneau est déjà occupé (Jean Martin). Choisissez un autre horaire.",
      );
      // La liste a été restaurée : le RDV a retrouvé son startTime d'origine.
      expect(store[CACHE_KEY][0].startTime.getTime()).toBe(
        new Date(2026, 5, 4, 10, 0).getTime(),
      );
      expect(showSuccessMock).not.toHaveBeenCalled();
    });
  });
});
