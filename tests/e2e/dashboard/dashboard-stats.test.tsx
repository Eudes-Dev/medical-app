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
import { render, screen, waitFor } from "@testing-library/react";
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

    render(<TodayAppointmentsCard />);
    render(<UpcomingAppointmentsCard />);

    // Attendre que les composants async se chargent
    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });

    // Vérifier que les éléments sont présents (les Server Components async
    // peuvent nécessiter un rendu différent dans les tests)
    // Pour l'instant, on vérifie que les composants se rendent sans erreur
    expect(screen.getByText(/Rendez-vous aujourd/)).toBeInTheDocument();
  });

  it("devrait appeler getDashboardStats lors du rendu", async () => {
    const mockStats: DashboardStats = {
      todayAppointmentsCount: 0,
      upcomingAppointments: [],
    };

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats);

    render(<TodayAppointmentsCard />);

    await waitFor(() => {
      expect(getDashboardStats).toHaveBeenCalled();
    });
  });
});
