/**
 * Tests E2E pour les composants DashboardStats
 * 
 * Test ID: 2.1-E2E-001
 * Priority: P1
 * Level: E2E
 * 
 * Note: Ces composants sont des Server Components async, donc les tests
 * vérifient principalement la structure et le comportement avec des mocks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TodayAppointmentsCard,
  UpcomingAppointmentsCard,
} from "@/components/dashboard/dashboard-stats";

// Mock la Server Action getDashboardStats
vi.mock("@/app/dashboard/actions", () => ({
  getDashboardStats: vi.fn(),
}));

import { getDashboardStats } from "@/app/dashboard/actions";
import type { DashboardStats } from "@/app/dashboard/actions";

describe("DashboardStats E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("2.1-E2E-001: devrait afficher les statistiques correctement", async () => {
    const mockStats: DashboardStats = {
      todayAppointmentsCount: 5,
      upcomingAppointments: [
        {
          id: "appt-1",
          startTime: new Date("2026-01-30T10:00:00Z"),
          endTime: new Date("2026-01-30T10:30:00Z"),
          patient: {
            firstName: "Jean",
            lastName: "Martin",
          },
          type: "Consultation",
          status: "CONFIRMED",
        },
        {
          id: "appt-2",
          startTime: new Date("2026-01-30T14:00:00Z"),
          endTime: new Date("2026-01-30T14:30:00Z"),
          patient: {
            firstName: "Marie",
            lastName: "Dupont",
          },
          type: "Suivi",
          status: "PENDING",
        },
      ],
    };

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);

    // Ces composants sont des Server Components async : RTL ne peut pas les
    // rendre via `<Component />` (« async Client Component »). On les invoque
    // comme fonctions, on attend le JSX résolu, puis on le rend (pattern RTL
    // pour async Server Components).
    render(await TodayAppointmentsCard());
    render(await UpcomingAppointmentsCard());

    expect(getDashboardStats).toHaveBeenCalled();

    // Carte du jour : titre + compteur.
    expect(screen.getByText(/Rendez-vous aujourd/)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    // Carte des prochains RDV : les patients mockés sont listés.
    expect(screen.getByText("Jean Martin")).toBeInTheDocument();
    expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });

  it("devrait appeler getDashboardStats lors du rendu", async () => {
    const mockStats: DashboardStats = {
      todayAppointmentsCount: 0,
      upcomingAppointments: [],
    };

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);

    render(await TodayAppointmentsCard());

    expect(getDashboardStats).toHaveBeenCalled();
  });
});
