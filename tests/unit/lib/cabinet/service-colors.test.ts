/**
 * Tests unitaires de la palette de couleurs des types de soins (story 7.3).
 */

import { describe, it, expect } from "vitest";
import {
  SERVICE_COLORS,
  SERVICE_COLOR_IDS,
  getServiceColor,
} from "@/lib/cabinet/service-colors";

describe("SERVICE_COLORS", () => {
  it("expose exactement 8 jetons de couleur", () => {
    expect(SERVICE_COLORS).toHaveLength(8);
    expect(SERVICE_COLOR_IDS).toHaveLength(8);
  });

  it("aligne les ids de la palette avec SERVICE_COLOR_IDS", () => {
    expect(SERVICE_COLORS.map((c) => c.id)).toEqual([...SERVICE_COLOR_IDS]);
  });

  it("chaque jeton porte un label, une classe dot et une classe accent", () => {
    for (const color of SERVICE_COLORS) {
      expect(color.label.length).toBeGreaterThan(0);
      expect(color.dot).toMatch(/^bg-/);
      expect(color.accent.length).toBeGreaterThan(0);
    }
  });

  it("n'a aucun identifiant en double", () => {
    expect(new Set(SERVICE_COLOR_IDS).size).toBe(SERVICE_COLOR_IDS.length);
  });
});

describe("getServiceColor", () => {
  it("résout un identifiant connu", () => {
    expect(getServiceColor("blue").id).toBe("blue");
    expect(getServiceColor("emerald").id).toBe("emerald");
  });

  it("retombe sur le jeton neutre (slate) pour un id inconnu", () => {
    expect(getServiceColor("magenta").id).toBe("slate");
  });

  it("retombe sur slate pour null / undefined", () => {
    expect(getServiceColor(null).id).toBe("slate");
    expect(getServiceColor(undefined).id).toBe("slate");
  });
});
