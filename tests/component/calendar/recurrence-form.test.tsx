/**
 * Tests component de la récurrence (Story 8.4, Task 5).
 *
 * Couvre :
 * - L'interrupteur affiche/masque les contrôles de récurrence.
 * - L'aperçu liste le bon nombre de dates.
 * - En **édition**, la section récurrence n'apparaît pas.
 * - Activer la récurrence route la soumission vers `createRecurringAppointments`
 *   (et non `createAppointment`).
 * - Le badge « Série » s'affiche dans le détail quand `seriesId` est présent.
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AppointmentWithPatient } from "@/types";

// Radix (Dialog/Switch) s'appuie sur ResizeObserver, absent de jsdom.
beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
});

// --- Mocks des Server Actions du calendrier --------------------------------
const createAppointmentMock = vi.fn();
const createRecurringAppointmentsMock = vi.fn();
const updateAppointmentMock = vi.fn();
const updateAppointmentStatusMock = vi.fn();
const deleteAppointmentMock = vi.fn();
const cancelAppointmentSeriesMock = vi.fn();
const deleteAppointmentSeriesMock = vi.fn();

vi.mock("@/app/dashboard/calendar/actions", () => ({
  createAppointment: (...a: unknown[]) => createAppointmentMock(...a),
  createRecurringAppointments: (...a: unknown[]) =>
    createRecurringAppointmentsMock(...a),
  updateAppointment: (...a: unknown[]) => updateAppointmentMock(...a),
  updateAppointmentStatus: (...a: unknown[]) => updateAppointmentStatusMock(...a),
  deleteAppointment: (...a: unknown[]) => deleteAppointmentMock(...a),
  cancelAppointmentSeries: (...a: unknown[]) => cancelAppointmentSeriesMock(...a),
  deleteAppointmentSeries: (...a: unknown[]) => deleteAppointmentSeriesMock(...a),
}));

// Catalogue de services : aucun → repli « Consultation ».
vi.mock("@/app/dashboard/settings/services/actions", () => ({
  getServiceTypes: vi.fn().mockResolvedValue([]),
}));

// PatientSelect simplifié : un bouton qui sélectionne un patient valide.
vi.mock("@/components/calendar/PatientSelect", () => ({
  PatientSelect: ({
    onChange,
  }: {
    onChange: (id: string, p: null) => void;
  }) =>
    React.createElement(
      "button",
      {
        type: "button",
        "data-testid": "select-patient",
        onClick: () => onChange("11111111-1111-1111-1111-111111111111", null),
      },
      "Choisir patient",
    ),
}));

// Toasts centralisés (références capturées pour assertions).
vi.mock("@/lib/ui/toast", () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));
import { showSuccess } from "@/lib/ui/toast";

// Store Zustand (clearCache).
vi.mock("@/stores/useCalendarStore", () => ({
  useCalendarStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ clearCache: vi.fn() }),
}));

// useIsMobile : pas de matchMedia en jsdom → on force desktop.
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import { CreateAppointmentModal } from "@/components/calendar/CreateAppointmentModal";
import { AppointmentDetailsModal } from "@/components/calendar/AppointmentDetailsModal";

// --- Fixtures --------------------------------------------------------------

/** Date de départ stable dans le futur (jeudi 9 juil. 2026, 09:00 local). */
function futureStart(): Date {
  return new Date(2026, 6, 9, 9, 0);
}

function makeAppointment(
  overrides: Partial<AppointmentWithPatient> = {},
): AppointmentWithPatient {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    patientId: "pat-1",
    startTime: new Date(2026, 6, 9, 9, 0),
    endTime: new Date(2026, 6, 9, 9, 30),
    status: "CONFIRMED",
    type: "Suivi",
    seriesId: null,
    notes: undefined,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    patient: {
      id: "pat-1",
      firstName: "Jean",
      lastName: "Martin",
      phone: "0600000000",
      createdAt: new Date(2026, 0, 1),
      updatedAt: new Date(2026, 0, 1),
    },
    ...overrides,
  };
}

describe("Story 8.4 — Section récurrence (création)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("l'interrupteur affiche/masque les contrôles", async () => {
    const user = userEvent.setup();
    render(
      <CreateAppointmentModal
        open
        onOpenChange={vi.fn()}
        defaultStartTime={futureStart()}
      />,
    );

    // Contrôles cachés tant que la récurrence n'est pas activée.
    expect(screen.queryByLabelText(/Fréquence/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Activer la récurrence/i));

    expect(screen.getByLabelText(/Fréquence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de RDV/i)).toBeInTheDocument();
  });

  it("l'aperçu liste le bon nombre de dates", async () => {
    const user = userEvent.setup();
    render(
      <CreateAppointmentModal
        open
        onOpenChange={vi.fn()}
        defaultStartTime={futureStart()}
      />,
    );

    await user.click(screen.getByLabelText(/Activer la récurrence/i));

    // Défaut = 4 occurrences.
    const list = await screen.findByLabelText("Dates de la série");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);

    // Passe à 6 occurrences → 6 dates dans l'aperçu.
    const input = screen.getByLabelText(/Nombre de RDV/i);
    await user.clear(input);
    await user.type(input, "6");

    await waitFor(() =>
      expect(within(list).getAllByRole("listitem")).toHaveLength(6),
    );
  });

  it("en édition, la section récurrence n'apparaît pas", async () => {
    render(
      <CreateAppointmentModal
        open
        onOpenChange={vi.fn()}
        appointment={makeAppointment()}
      />,
    );
    // `waitFor` enveloppe le chargement async des services dans `act(...)`.
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/Activer la récurrence/i),
      ).not.toBeInTheDocument(),
    );
  });

  it("activer la récurrence route la soumission vers createRecurringAppointments", async () => {
    const user = userEvent.setup();
    createRecurringAppointmentsMock.mockResolvedValue({
      success: true,
      seriesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      created: 4,
      skipped: 0,
      skippedDates: [],
    });

    render(
      <CreateAppointmentModal
        open
        onOpenChange={vi.fn()}
        defaultStartTime={futureStart()}
      />,
    );

    // Sélectionne un patient (requis par le schéma).
    await user.click(screen.getByTestId("select-patient"));
    // Active la récurrence.
    await user.click(screen.getByLabelText(/Activer la récurrence/i));
    // Soumet.
    await user.click(screen.getByRole("button", { name: /Créer le rendez-vous/i }));

    await waitFor(() =>
      expect(createRecurringAppointmentsMock).toHaveBeenCalledTimes(1),
    );
    expect(createAppointmentMock).not.toHaveBeenCalled();
    // La récurrence transmise reflète la fréquence + occurrences par défaut.
    const [, recurrence] = createRecurringAppointmentsMock.mock.calls[0];
    expect(recurrence).toMatchObject({ frequency: "weekly", occurrences: 4 });
  });

  it("borne le nombre d'occurrences : validation inline + soumission clampée", async () => {
    const user = userEvent.setup();
    createRecurringAppointmentsMock.mockResolvedValue({
      success: true,
      seriesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      created: 26,
      skipped: 0,
      skippedDates: [],
    });

    render(
      <CreateAppointmentModal
        open
        onOpenChange={vi.fn()}
        defaultStartTime={futureStart()}
      />,
    );

    await user.click(screen.getByTestId("select-patient"));
    await user.click(screen.getByLabelText(/Activer la récurrence/i));

    // Saisie hors borne (30 > 26) → message inline + aperçu clampé à 26.
    const input = screen.getByLabelText(/Nombre de RDV/i);
    await user.clear(input);
    await user.type(input, "30");

    expect(await screen.findByRole("alert")).toHaveTextContent(/ajusté à 26/i);
    const list = screen.getByLabelText("Dates de la série");
    await waitFor(() =>
      expect(within(list).getAllByRole("listitem")).toHaveLength(26),
    );

    // La soumission envoie la valeur clampée (26), jamais 30.
    await user.click(screen.getByRole("button", { name: /Créer le rendez-vous/i }));
    await waitFor(() =>
      expect(createRecurringAppointmentsMock).toHaveBeenCalledTimes(1),
    );
    const [, recurrence] = createRecurringAppointmentsMock.mock.calls[0];
    expect(recurrence.occurrences).toBe(26);
  });
});

describe("Story 8.4 — Badge « Série » (détail)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le badge et les actions de série quand seriesId est présent", () => {
    render(
      <AppointmentDetailsModal
        open
        onOpenChange={vi.fn()}
        appointment={makeAppointment({
          seriesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        })}
      />,
    );

    expect(screen.getByText("Série")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Annuler toute la série à venir/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Supprimer toute la série à venir/i }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas le badge ni les actions de série pour un RDV non récurrent", () => {
    render(
      <AppointmentDetailsModal
        open
        onOpenChange={vi.fn()}
        appointment={makeAppointment({ seriesId: null })}
      />,
    );

    expect(screen.queryByText("Série")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /toute la série à venir/i }),
    ).not.toBeInTheDocument();
  });

  it("« Annuler toute la série à venir » appelle cancelAppointmentSeries(seriesId, startTime) + wording pluralisé", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    cancelAppointmentSeriesMock.mockResolvedValue({ success: true, affected: 3 });

    const appt = makeAppointment({
      seriesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      startTime: new Date(2026, 6, 9, 9, 0),
    });
    render(
      <AppointmentDetailsModal open onOpenChange={vi.fn()} appointment={appt} />,
    );

    await user.click(
      screen.getByRole("button", { name: /Annuler toute la série à venir/i }),
    );

    await waitFor(() =>
      expect(cancelAppointmentSeriesMock).toHaveBeenCalledWith(
        appt.seriesId,
        appt.startTime,
      ),
    );
    expect(deleteAppointmentSeriesMock).not.toHaveBeenCalled();
    // Wording pluralisé à partir de `affected`.
    expect(vi.mocked(showSuccess)).toHaveBeenCalledWith(
      expect.stringMatching(/3 rendez-vous annulés/i),
    );
    confirmSpy.mockRestore();
  });

  it("« Supprimer toute la série à venir » appelle deleteAppointmentSeries + wording singulier", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteAppointmentSeriesMock.mockResolvedValue({ success: true, affected: 1 });

    const appt = makeAppointment({
      seriesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      startTime: new Date(2026, 6, 9, 9, 0),
    });
    render(
      <AppointmentDetailsModal open onOpenChange={vi.fn()} appointment={appt} />,
    );

    await user.click(
      screen.getByRole("button", { name: /Supprimer toute la série à venir/i }),
    );

    await waitFor(() =>
      expect(deleteAppointmentSeriesMock).toHaveBeenCalledWith(
        appt.seriesId,
        appt.startTime,
      ),
    );
    // Singulier (1 RDV) — pas de « s » parasite (terminé par « supprimé. »).
    expect(vi.mocked(showSuccess)).toHaveBeenCalledWith(
      expect.stringMatching(/1 rendez-vous supprimé\./i),
    );
    confirmSpy.mockRestore();
  });

  it("masque « Annuler toute la série » quand l'occurrence courante est annulée", () => {
    render(
      <AppointmentDetailsModal
        open
        onOpenChange={vi.fn()}
        appointment={makeAppointment({
          seriesId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "CANCELLED",
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Annuler toute la série à venir/i }),
    ).not.toBeInTheDocument();
    // La suppression de série reste possible.
    expect(
      screen.getByRole("button", { name: /Supprimer toute la série à venir/i }),
    ).toBeInTheDocument();
  });
});
