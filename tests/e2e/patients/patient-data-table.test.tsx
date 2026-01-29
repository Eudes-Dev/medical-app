/**
 * Tests E2E pour le composant PatientDataTable
 * 
 * Test IDs: 2.1-E2E-002, 2.1-E2E-003, 2.1-E2E-004, 2.1-E2E-005
 * Priority: P0, P1, P1, P1
 * Level: E2E
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatientDataTable } from "@/components/patients/patient-data-table";
import type { PatientTableData } from "@/app/dashboard/patients/actions";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("PatientDataTable E2E", () => {
  const mockPatients: PatientTableData[] = [
    {
      id: "patient-1",
      firstName: "Jean",
      lastName: "Martin",
      email: "jean.martin@example.com",
      phone: "0612345678",
    },
    {
      id: "patient-2",
      firstName: "Marie",
      lastName: "Dupont",
      email: "marie.dupont@example.com",
      phone: "0698765432",
    },
    {
      id: "patient-3",
      firstName: "Pierre",
      lastName: "Bernard",
      email: null,
      phone: "0645678901",
    },
  ];

  it("2.1-E2E-002: devrait afficher la table avec les données des patients", () => {
    const onPageChange = vi.fn();
    render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
        onPageChange={onPageChange}
      />
    );

    // Vérifier que les en-têtes de colonnes sont présents
    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByText("Prénom")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Téléphone")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Vérifier que les données des patients sont affichées
    expect(screen.getByText("Martin")).toBeInTheDocument();
    expect(screen.getByText("Jean")).toBeInTheDocument();
    expect(screen.getByText("jean.martin@example.com")).toBeInTheDocument();
    expect(screen.getByText("0612345678")).toBeInTheDocument();

    expect(screen.getByText("Dupont")).toBeInTheDocument();
    expect(screen.getByText("Marie")).toBeInTheDocument();
  });

  it("devrait afficher un tiret pour les emails null", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
      />
    );

    // Vérifier que le patient sans email affiche un tiret
    const emailCells = screen.getAllByText("—");
    expect(emailCells.length).toBeGreaterThan(0);
  });

  it("2.1-E2E-003: devrait utiliser les styles Shadcn UI (vérification structure)", () => {
    const { container } = render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
      />
    );

    // Vérifier que la structure de la table est présente
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();

    // Vérifier que les classes Tailwind sont appliquées (structure de base)
    const tableWrapper = container.querySelector(".rounded-md.border");
    expect(tableWrapper).toBeInTheDocument();
  });

  it("2.1-E2E-005: devrait générer les liens corrects vers les fiches patient", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={mockPatients.length}
      />
    );

    // Vérifier que les boutons "Voir" sont présents avec les bons liens
    const voirButtons = screen.getAllByText("Voir");
    expect(voirButtons.length).toBe(mockPatients.length);

    // Vérifier que les liens pointent vers les bonnes routes
    const firstLink = voirButtons[0].closest("a");
    expect(firstLink).toHaveAttribute("href", "/dashboard/patients/patient-1");

    const secondLink = voirButtons[1].closest("a");
    expect(secondLink).toHaveAttribute("href", "/dashboard/patients/patient-2");
  });

  it("devrait afficher un message quand aucun patient n'est trouvé", () => {
    render(
      <PatientDataTable patients={[]} total={0} />
    );

    expect(screen.getByText("Aucun patient trouvé.")).toBeInTheDocument();
  });

  it("devrait afficher les informations de pagination", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={25}
      />
    );

    // Vérifier que les informations de pagination sont affichées
    // Le texte exact peut varier selon le formatage, utiliser une recherche plus flexible
    expect(screen.getByText(/Affichage de/)).toBeInTheDocument();
    expect(screen.getByText(/sur 25/)).toBeInTheDocument();
  });

  it("devrait permettre la navigation entre les pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <PatientDataTable
        patients={mockPatients}
        total={25}
        onPageChange={onPageChange}
      />
    );

    // Vérifier que le bouton "Suivant" est présent et activé
    const nextButton = screen.getByText("Suivant");
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).not.toBeDisabled();

    // Cliquer sur "Suivant"
    await user.click(nextButton);

    // Vérifier que onPageChange a été appelé avec la page 2
    await waitFor(() => {
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  it("devrait désactiver le bouton Précédent sur la première page", () => {
    render(
      <PatientDataTable
        patients={mockPatients}
        total={25}
      />
    );

    const previousButton = screen.getByText("Précédent");
    expect(previousButton).toBeDisabled();
  });

  it("devrait désactiver le bouton Suivant sur la dernière page", () => {
    // Simuler la dernière page (3 patients, total de 3)
    render(
      <PatientDataTable
        patients={mockPatients}
        total={3}
      />
    );

    const nextButton = screen.getByText("Suivant");
    expect(nextButton).toBeDisabled();
  });
});
