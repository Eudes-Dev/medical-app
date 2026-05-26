import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoadingButton } from "@/components/ui/loading-button";

describe("LoadingButton", () => {
  it("rend le label par défaut quand isLoading=false", () => {
    render(<LoadingButton>Enregistrer</LoadingButton>);
    expect(screen.getByText("Enregistrer")).toBeInTheDocument();
  });

  it("affiche le loadingText + aria-busy quand isLoading=true", () => {
    render(
      <LoadingButton isLoading loadingText="Création…">
        Créer
      </LoadingButton>,
    );
    expect(screen.getByText("Création…")).toBeInTheDocument();
    expect(screen.queryByText("Créer")).not.toBeInTheDocument();
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("utilise « Chargement… » par défaut", () => {
    render(<LoadingButton isLoading>X</LoadingButton>);
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
  });

  it("n'appelle pas onClick quand isLoading=true", async () => {
    const onClick = vi.fn();
    render(
      <LoadingButton isLoading onClick={onClick}>
        Submit
      </LoadingButton>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("appelle onClick quand isLoading=false", async () => {
    const onClick = vi.fn();
    render(<LoadingButton onClick={onClick}>Submit</LoadingButton>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
