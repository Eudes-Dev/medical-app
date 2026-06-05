/**
 * Tests component/intégration de la vue mois (Story 8.3, Task 5).
 *
 * Couvre :
 * - AC 3/4 : `MonthGrid` rend le bon nombre de cellules (semaines complètes),
 *   affiche un badge compteur pour les jours avec RDV, atténue les jours hors
 *   du mois pivot (débordements de semaine).
 * - AC 5 : un congé/férié est signalé dans la cellule (marqueur + aria-label).
 * - AC 6 : cliquer / activer au clavier une cellule appelle `onSelectDay` avec
 *   la bonne date.
 * - AC 1/2 : l'option « Mois » du header appelle `setViewMode("month")` et, en
 *   mode mois, le titre affiche « <Mois> <année> ».
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isSameDay } from "date-fns";

import { MonthGrid } from "@/components/calendar/MonthGrid";
import type { CalendarTimeOff } from "@/components/calendar/CalendarGrid";
import type { AppointmentWithPatient } from "@/types";

// --- Mock du store (uniquement pour le header) -----------------------------
const mocks = vi.hoisted(() => ({
  setViewMode: vi.fn(),
  goToPrevious: vi.fn(),
  goToNext: vi.fn(),
  goToToday: vi.fn(),
  state: { pivotDate: new Date(2026, 5, 15), viewMode: "week" as string },
}));

vi.mock("@/stores/useCalendarStore", () => ({
  useCalendarStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      pivotDate: mocks.state.pivotDate,
      viewMode: mocks.state.viewMode,
      goToPrevious: mocks.goToPrevious,
      goToNext: mocks.goToNext,
      goToToday: mocks.goToToday,
      setViewMode: mocks.setViewMode,
    }),
}));

// Import APRÈS le mock pour que le header consomme le store mocké.
import { CalendarHeader } from "@/components/calendar/CalendarHeader";

// --- Fixtures --------------------------------------------------------------
function makeApt(
  overrides: Partial<AppointmentWithPatient> = {},
): AppointmentWithPatient {
  return {
    id: `apt-${Math.random().toString(36).slice(2)}`,
    patientId: "pat-1",
    startTime: new Date(2026, 5, 17, 10, 0),
    endTime: new Date(2026, 5, 17, 10, 30),
    status: "CONFIRMED",
    type: "Suivi",
    serviceColor: "blue",
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    patient: { id: "pat-1", firstName: "Marie", lastName: "Durand" },
    ...overrides,
  } as AppointmentWithPatient;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.viewMode = "week";
  mocks.state.pivotDate = new Date(2026, 5, 15);
});

afterEach(() => {
  // Certains tests figent l'horloge (vi.setSystemTime) pour « aujourd'hui » ;
  // on restaure les vrais timers pour ne pas perturber userEvent.
  vi.useRealTimers();
});

describe("MonthGrid (Story 8.3)", () => {
  // Juin 2026 : 1er = lundi → grille de 5 semaines complètes (35 cellules).
  const JUNE_2026 = new Date(2026, 5, 15);

  it("AC 3 : rend une cellule par jour de la grille (semaines complètes = 35)", () => {
    render(<MonthGrid pivotDate={JUNE_2026} onSelectDay={vi.fn()} />);
    // Chaque cellule-jour est un <button> ; la légende n'en est pas un.
    expect(screen.getAllByRole("button")).toHaveLength(35);
  });

  it("AC 4 : affiche un badge compteur pour un jour avec RDV (annulés exclus)", () => {
    const byDay: Record<string, AppointmentWithPatient[]> = {
      "2026-06-17": [
        makeApt(),
        makeApt({ startTime: new Date(2026, 5, 17, 11, 0) }),
        makeApt({ status: "CANCELLED" }), // ne compte pas
      ],
    };
    render(
      <MonthGrid pivotDate={JUNE_2026} appointmentsByDay={byDay} onSelectDay={vi.fn()} />,
    );
    // aria-label de la cellule : « 17 juin 2026, 2 rendez-vous — ouvrir la journée »
    const cell = screen.getByRole("button", {
      name: /17 juin 2026, 2 rendez-vous/i,
    });
    expect(cell).toBeInTheDocument();
  });

  it("AC 4 : un jour sans RDV ne porte pas de compteur (cellule neutre)", () => {
    render(<MonthGrid pivotDate={JUNE_2026} onSelectDay={vi.fn()} />);
    const cell = screen.getByRole("button", {
      name: /18 juin 2026, aucun rendez-vous/i,
    });
    expect(cell).toBeInTheDocument();
  });

  it("AC 3 : atténue les jours hors du mois pivot (débordement de semaine)", () => {
    render(<MonthGrid pivotDate={JUNE_2026} onSelectDay={vi.fn()} />);
    // 1er juillet 2026 (mercredi) est un débordement de la dernière semaine.
    const overflow = screen.getByRole("button", { name: /1 juillet 2026/i });
    expect(overflow.className).toContain("bg-muted/30");
    // Un jour du mois pivot n'est pas atténué.
    const inMonth = screen.getByRole("button", { name: /15 juin 2026/i });
    expect(inMonth.className).not.toContain("bg-muted/30");
  });

  it("AC 4 : met en évidence « aujourd'hui » (aria-current=date)", () => {
    // On fige l'horloge sur le 17 juin 2026 pour rendre le test déterministe.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 17, 9, 0));

    render(<MonthGrid pivotDate={JUNE_2026} onSelectDay={vi.fn()} />);
    const today = screen.getByRole("button", { name: /17 juin 2026/i });
    expect(today).toHaveAttribute("aria-current", "date");
    // Un autre jour ne porte pas aria-current.
    const other = screen.getByRole("button", { name: /18 juin 2026/i });
    expect(other).not.toHaveAttribute("aria-current");
  });

  it("AC 4 : colore la cellule en surcharge (count >= seuil)", () => {
    // 12 RDV actifs le 17 juin 2026 → seuil OVERLOAD_THRESHOLD atteint.
    const overloadDay = Array.from({ length: 12 }, (_, i) =>
      makeApt({ startTime: new Date(2026, 5, 17, 8 + i, 0) }),
    );
    render(
      <MonthGrid
        pivotDate={JUNE_2026}
        appointmentsByDay={{ "2026-06-17": overloadDay }}
        onSelectDay={vi.fn()}
      />,
    );
    const cell = screen.getByRole("button", { name: /17 juin 2026, 12 rendez-vous/i });
    // Teinte rose de surcharge sur la cellule.
    expect(cell.className).toContain("bg-rose-50/60");
    // Le badge compteur passe en rose plein.
    const badge = within(cell).getByText("12");
    expect(badge.className).toContain("bg-rose-500");
  });

  it("AC 5 : signale un congé/férié dans la cellule (aria-label)", () => {
    const timeOffs: CalendarTimeOff[] = [
      {
        id: "off-1",
        reason: "Congé annuel",
        source: "MANUAL",
        startDate: new Date(2026, 5, 17),
        endDate: new Date(2026, 5, 17),
        allDay: true,
        startTime: null,
        endTime: null,
      },
    ];
    render(
      <MonthGrid pivotDate={JUNE_2026} timeOffs={timeOffs} onSelectDay={vi.fn()} />,
    );
    const cell = screen.getByRole("button", { name: /17 juin 2026.*Congé annuel/i });
    expect(cell).toBeInTheDocument();
  });

  it("AC 6 : cliquer une cellule appelle onSelectDay avec la bonne date", async () => {
    const onSelectDay = vi.fn();
    const user = userEvent.setup();
    render(<MonthGrid pivotDate={JUNE_2026} onSelectDay={onSelectDay} />);

    await user.click(screen.getByRole("button", { name: /17 juin 2026/i }));

    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(isSameDay(onSelectDay.mock.calls[0][0], new Date(2026, 5, 17))).toBe(true);
  });

  it("AC 6 : activer une cellule au clavier (Enter) appelle onSelectDay", async () => {
    const onSelectDay = vi.fn();
    const user = userEvent.setup();
    render(<MonthGrid pivotDate={JUNE_2026} onSelectDay={onSelectDay} />);

    const cell = screen.getByRole("button", { name: /17 juin 2026/i });
    cell.focus();
    await user.keyboard("{Enter}");

    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(isSameDay(onSelectDay.mock.calls[0][0], new Date(2026, 5, 17))).toBe(true);
  });
});

describe("CalendarHeader — option Mois (Story 8.3)", () => {
  it("AC 1 : cliquer « Mois » appelle setViewMode('month')", async () => {
    const user = userEvent.setup();
    render(<CalendarHeader />);

    await user.click(screen.getByRole("button", { name: /Vue Mois/i }));

    expect(mocks.setViewMode).toHaveBeenCalledWith("month");
  });

  it("AC 2 : en mode mois, le titre affiche « <Mois> <année> »", () => {
    mocks.state.viewMode = "month";
    mocks.state.pivotDate = new Date(2026, 5, 15); // juin 2026
    render(<CalendarHeader />);

    // capitalize est purement CSS → le texte DOM reste « juin 2026 ».
    expect(screen.getByText(/^juin 2026$/i)).toBeInTheDocument();
  });
});
