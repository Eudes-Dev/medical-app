/**
 * Tests unitaires pour le composant PatientDataTable
 * 
 * Test IDs: 2.1-UNIT-001, 2.1-UNIT-003, 2.1-UNIT-004
 * Priority: P2, P1, P1
 * Level: Unit
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientDataTable } from "@/components/patients/patient-data-table";
import type { PatientTableData } from "@/app/dashboard/patients/actions";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PatientDataTable Unit", () => {
  const mockPatients: PatientTableData[] = [
    {
      id: "patient-1",
      firstName: "Jean",
      lastName: "Martin",
      email: "jean.martin@example.com",
      phone: "0612345678",
    },
  ];

  it("2.1-UNIT-001: devrait rendre les colonnes correctement", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
      />
    );

    // Vérifier que toutes les colonnes sont présentes
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByText("Prénom")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Téléphone")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("2.1-UNIT-003: devrait gérer la pagination correctement", () => {
    const onPageChange = vi.fn();
    render(
      <PatientDataTable
        patients={mockPatients}
        total={25}
        onPageChange={onPageChange}
      />
    );

    // Vérifier que les informations de pagination sont présentes
    expect(screen.getByText(/Affichage de/)).toBeInTheDocument();
    expect(screen.getByText(/sur 25/)).toBeInTheDocument();
    
    // Vérifier que les boutons de pagination sont présents
    expect(screen.getByText("Précédent")).toBeInTheDocument();
    expect(screen.getByText("Suivant")).toBeInTheDocument();
  });

  it("2.1-UNIT-004: devrait générer les liens corrects vers les fiches patient", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
      />
    );

    const voirButton = screen.getByText("Voir");
    const link = voirButton.closest("a");

    expect(link).toHaveAttribute("href", "/dashboard/patients/patient-1");
  });

  it("devrait formater correctement les données des patients", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
      />
    );

    // Vérifier que les données sont formatées correctement
    expect(screen.getByText("Martin")).toBeInTheDocument();
    expect(screen.getByText("Jean")).toBeInTheDocument();
    expect(screen.getByText("jean.martin@example.com")).toBeInTheDocument();
    expect(screen.getByText("0612345678")).toBeInTheDocument();
  });
});
