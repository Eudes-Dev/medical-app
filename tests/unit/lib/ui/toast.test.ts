import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from "@/components/ui/sonner";
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
} from "@/lib/ui/toast";

describe("lib/ui/toast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("showSuccess délègue à toast.success avec le message", () => {
    showSuccess("Patient créé");
    expect(toast.success).toHaveBeenCalledWith("Patient créé", undefined);
  });

  it("showError délègue à toast.error avec une description optionnelle", () => {
    showError("Erreur", { description: "Détails" });
    expect(toast.error).toHaveBeenCalledWith("Erreur", {
      description: "Détails",
    });
  });

  it("showInfo délègue à toast.info", () => {
    showInfo("Info");
    expect(toast.info).toHaveBeenCalledWith("Info", undefined);
  });

  it("showWarning délègue à toast.warning", () => {
    showWarning("Attention");
    expect(toast.warning).toHaveBeenCalledWith("Attention", undefined);
  });
});
