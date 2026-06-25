/**
 * Tests component de la liste d'attente (story 8.5, Task 5).
 *
 * Couvre :
 * - `WaitlistView` : rendu de la liste (ordre serveur préservé), badge de
 *   priorité correct, état vide, conversion (« Programmer un rendez-vous » ouvre
 *   la modal de création pré-remplie → succès marque l'entrée `SCHEDULED`),
 *   retrait (« Retirer » appelle `removeFromWaitlist` après `confirm`).
 * - `AddToWaitlistModal` : la soumission route vers `addToWaitlist` avec le bon
 *   payload.
 */

import * as React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { WaitlistEntryWithPatient } from "@/types";

// Radix (Dialog) s'appuie sur ResizeObserver, absent de jsdom.
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

// --- Mocks ------------------------------------------------------------------
const addToWaitlistMock = vi.fn();
const updateWaitlistEntryMock = vi.fn();
const removeFromWaitlistMock = vi.fn();
const markWaitlistScheduledMock = vi.fn();

vi.mock("@/app/dashboard/waitlist/actions", () => ({
  addToWaitlist: (...a: unknown[]) => addToWaitlistMock(...a),
  updateWaitlistEntry: (...a: unknown[]) => updateWaitlistEntryMock(...a),
  removeFromWaitlist: (...a: unknown[]) => removeFromWaitlistMock(...a),
  markWaitlistScheduled: (...a: unknown[]) => markWaitlistScheduledMock(...a),
}));

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
        onClick: () => onChange("11111111-1111-4111-8111-111111111111", null),
      },
      "Choisir patient",
    ),
}));

// CreateAppointmentModal stub : expose le pré-remplissage + un bouton de succès.
vi.mock("@/components/calendar/CreateAppointmentModal", () => ({
  CreateAppointmentModal: ({
    open,
    initialPatientId,
    initialServiceTypeId,
    onSuccess,
  }: {
    open: boolean;
    initialPatientId?: string;
    initialServiceTypeId?: string;
    onSuccess?: (a?: { id: string }) => void;
  }) =>
    open
      ? React.createElement("div", { "data-testid": "create-modal" }, [
          React.createElement(
            "span",
            { key: "p", "data-testid": "prefill-patient" },
            initialPatientId,
          ),
          React.createElement(
            "span",
            { key: "s", "data-testid": "prefill-service" },
            initialServiceTypeId ?? "",
          ),
          React.createElement(
            "button",
            {
              key: "b",
              type: "button",
              "data-testid": "confirm-create",
              onClick: () => onSuccess?.({ id: "appt-created-1" }),
            },
            "Créer",
          ),
        ])
      : null,
}));

vi.mock("@/lib/ui/toast", () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
}));

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

import { WaitlistView } from "@/components/waitlist/WaitlistView";
import { AddToWaitlistModal } from "@/components/waitlist/AddToWaitlistModal";

function entry(overrides: Partial<WaitlistEntryWithPatient> = {}): WaitlistEntryWithPatient {
  return {
    id: "entry-1",
    patientId: "patient-1",
    priority: "NORMAL",
    status: "WAITING",
    reason: null,
    notes: null,
    preferredFrom: null,
    preferredTo: null,
    createdAt: new Date("2026-06-01T09:00:00Z"),
    patient: {
      id: "patient-1",
      firstName: "Jean",
      lastName: "Martin",
      phone: "0600000000",
      email: null,
    },
    serviceType: null,
    ...overrides,
  };
}

describe("WaitlistView (Story 8.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche l'état vide quand la file est vide", () => {
    render(<WaitlistView entries={[]} />);
    expect(
      screen.getByText("Aucun patient en liste d'attente"),
    ).toBeInTheDocument();
  });

  it("rend les entrées dans l'ordre fourni avec le bon badge de priorité", () => {
    render(
      <WaitlistView
        entries={[
          entry({ id: "u", priority: "URGENT", patient: { id: "p1", firstName: "Alice", lastName: "Urgent", phone: "1", email: null } }),
          entry({ id: "n", priority: "NORMAL", patient: { id: "p2", firstName: "Bob", lastName: "Normal", phone: "2", email: null } }),
        ]}
      />,
    );
    const urgentBadge = screen.getByText("Urgente");
    const normalBadge = screen.getByText("Normal");
    expect(urgentBadge).toBeInTheDocument();
    expect(normalBadge).toBeInTheDocument();

    // Ordre du DOM = ordre fourni (déjà trié côté serveur) : URGENT avant NORMAL.
    expect(
      urgentBadge.compareDocumentPosition(normalBadge) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("retrait : « Retirer » appelle removeFromWaitlist après confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    removeFromWaitlistMock.mockResolvedValue({ success: true });

    render(<WaitlistView entries={[entry({ id: "to-remove" })]} />);

    await user.click(screen.getByRole("button", { name: /Retirer/i }));

    await waitFor(() =>
      expect(removeFromWaitlistMock).toHaveBeenCalledWith("to-remove"),
    );
  });

  it("édition : « Modifier » ouvre la modale pré-remplie (patient figé)", async () => {
    const user = userEvent.setup();

    render(
      <WaitlistView
        entries={[
          entry({
            id: "to-edit",
            priority: "HIGH",
            reason: "Suivi rapproché",
          }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Modifier/i }));

    // Titre d'édition + patient en lecture seule (pas de bouton de sélection).
    expect(screen.getByText("Modifier l'entrée")).toBeInTheDocument();
    expect(screen.queryByTestId("select-patient")).not.toBeInTheDocument();
    // Le patient figé apparaît dans la modale (en plus de la ligne de la liste).
    expect(screen.getAllByText("Jean Martin").length).toBeGreaterThanOrEqual(2);
    // Motif pré-rempli.
    expect(screen.getByDisplayValue("Suivi rapproché")).toBeInTheDocument();
  });

  it("conversion : ouvre la modal pré-remplie et marque l'entrée SCHEDULED au succès", async () => {
    const user = userEvent.setup();
    markWaitlistScheduledMock.mockResolvedValue({ success: true });

    render(
      <WaitlistView
        entries={[
          entry({
            id: "to-convert",
            patientId: "patient-42",
            serviceType: { id: "svc-9", label: "Détartrage", durationMin: 30, color: "blue" },
          }),
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Programmer un rendez-vous/i }),
    );

    // Modal ouverte avec le bon pré-remplissage.
    expect(screen.getByTestId("prefill-patient")).toHaveTextContent("patient-42");
    expect(screen.getByTestId("prefill-service")).toHaveTextContent("svc-9");

    // Succès de createAppointment → markWaitlistScheduled(entry, appt).
    await user.click(screen.getByTestId("confirm-create"));
    await waitFor(() =>
      expect(markWaitlistScheduledMock).toHaveBeenCalledWith(
        "to-convert",
        "appt-created-1",
      ),
    );
  });
});

describe("AddToWaitlistModal (Story 8.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("route la soumission vers addToWaitlist avec le bon payload", async () => {
    const user = userEvent.setup();
    addToWaitlistMock.mockResolvedValue({ success: true, entry: entry() });
    const onOpenChange = vi.fn();

    render(
      <AddToWaitlistModal open onOpenChange={onOpenChange} onSuccess={vi.fn()} />,
    );

    // Sélectionne un patient via le stub.
    await user.click(screen.getByTestId("select-patient"));

    // Soumet.
    await user.click(screen.getByRole("button", { name: /Ajouter à la liste/i }));

    await waitFor(() => expect(addToWaitlistMock).toHaveBeenCalledTimes(1));
    expect(addToWaitlistMock.mock.calls[0][0]).toMatchObject({
      patientId: "11111111-1111-4111-8111-111111111111",
      priority: "NORMAL",
    });
  });

  it("mode édition : la soumission route vers updateWaitlistEntry(id, …)", async () => {
    const user = userEvent.setup();
    updateWaitlistEntryMock.mockResolvedValue({ success: true, entry: entry() });
    const onOpenChange = vi.fn();

    render(
      <AddToWaitlistModal
        open
        entry={entry({
          id: "edit-7",
          priority: "HIGH",
          // patientId valide (UUID) : le schéma le valide même si le champ est figé.
          patientId: "11111111-1111-4111-8111-111111111111",
        })}
        onOpenChange={onOpenChange}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Enregistrer/i }));

    await waitFor(() => expect(updateWaitlistEntryMock).toHaveBeenCalledTimes(1));
    expect(updateWaitlistEntryMock.mock.calls[0][0]).toBe("edit-7");
    expect(updateWaitlistEntryMock.mock.calls[0][1]).toMatchObject({
      priority: "HIGH",
    });
    expect(addToWaitlistMock).not.toHaveBeenCalled();
  });
});
