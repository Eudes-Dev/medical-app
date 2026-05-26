// @vitest-environment node
/**
 * Tests unitaires — validation E.164 et détection mobile FR (story 6.3, Task 3).
 */

import { describe, it, expect } from "vitest";
import { toE164, isMobileFR, getPatientSmsTarget } from "@/lib/sms/phone";

describe("toE164", () => {
  it("normalise un numéro FR national en E.164", () => {
    expect(toE164("0612345678")).toBe("+33612345678");
  });

  it("est idempotent sur un numéro déjà en E.164", () => {
    expect(toE164("+33612345678")).toBe("+33612345678");
  });

  it("tolère les espaces", () => {
    expect(toE164("06 12 34 56 78")).toBe("+33612345678");
  });

  it("retourne null pour une chaîne invalide", () => {
    expect(toE164("abc")).toBeNull();
  });

  it("retourne null pour une chaîne vide", () => {
    expect(toE164("")).toBeNull();
  });

  it("normalise aussi un fixe FR (parsing OK)", () => {
    expect(toE164("0145678901")).toBe("+33145678901");
  });
});

describe("isMobileFR", () => {
  it("accepte un mobile +336", () => {
    expect(isMobileFR("+33612345678")).toBe(true);
  });

  it("accepte un mobile +337", () => {
    expect(isMobileFR("+33712345678")).toBe(true);
  });

  it("rejette un fixe parisien +331", () => {
    expect(isMobileFR("+33145678901")).toBe(false);
  });

  it("rejette un numéro non-FR", () => {
    expect(isMobileFR("+14155551234")).toBe(false);
  });
});

describe("getPatientSmsTarget", () => {
  it("retourne le numéro E.164 pour un mobile FR valide", () => {
    expect(getPatientSmsTarget({ phone: "0612345678" })).toBe("+33612345678");
  });

  it("retourne null pour un fixe FR (parse OK mais pas mobile)", () => {
    expect(getPatientSmsTarget({ phone: "0145678901" })).toBeNull();
  });

  it("retourne null pour un numéro invalide", () => {
    expect(getPatientSmsTarget({ phone: "abc" })).toBeNull();
  });
});
