/**
 * Tests E2E pour le composant PatientTableSkeleton
 * 
 * Test ID: 2.1-E2E-006
 * Priority: P2
 * Level: E2E
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatientTableSkeleton } from "@/components/patients/patient-table-skeleton";

describe("PatientTableSkeleton E2E", () => {
  it("2.1-E2E-006: devrait afficher le skeleton pendant le chargement", () => {
    const { container } = render(<PatientTableSkeleton />);

    // Vérifier que la structure de la table est présente
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();

    // Vérifier que les en-têtes sont présents (avec skeleton)
    const headers = container.querySelectorAll("thead th");
    expect(headers.length).toBe(5); // Nom, Prénom, Email, Téléphone, Actions

    // Vérifier que 10 lignes de skeleton sont affichées
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(10);
  });

  it("devrait avoir la même structure que la table réelle", () => {
    const { container } = render(<PatientTableSkeleton />);

    // Vérifier la structure de base
    expect(container.querySelector(".rounded-md.border")).toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("thead")).toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
  });
});
