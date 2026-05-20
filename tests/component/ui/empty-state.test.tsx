import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("affiche un titre seul (description et action absentes)", () => {
    render(<EmptyState icon={Users} title="Aucun patient" />);
    expect(screen.getByText("Aucun patient")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Aucun patient",
    );
  });

  it("affiche la description quand fournie", () => {
    render(
      <EmptyState
        icon={Users}
        title="Aucun patient"
        description="Créez votre premier patient."
      />,
    );
    expect(
      screen.getByText("Créez votre premier patient."),
    ).toBeInTheDocument();
  });

  it("affiche le slot action quand fourni", () => {
    render(
      <EmptyState
        icon={Users}
        title="Aucun patient"
        action={<button>Nouveau</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Nouveau" })).toBeInTheDocument();
  });

  it("l'icône est marquée aria-hidden", () => {
    const { container } = render(
      <EmptyState icon={Users} title="Aucun patient" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
