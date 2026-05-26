import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";

describe("CalendarSkeleton", () => {
  it("expose role=status + aria-label + texte sr-only", () => {
    render(<CalendarSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Chargement de l'agenda");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Chargement en cours…")).toBeInTheDocument();
  });
});
