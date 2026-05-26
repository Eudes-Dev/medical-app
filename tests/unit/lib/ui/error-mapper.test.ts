import { describe, it, expect } from "vitest";

import { mapServerErrorToMessage } from "@/lib/ui/error-mapper";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

describe("lib/ui/error-mapper", () => {
  it("VALIDATION → message validation", () => {
    expect(mapServerErrorToMessage({ error: "VALIDATION" })).toBe(
      TOAST_MESSAGES.errors.validation,
    );
  });

  it("SLOT_TAKEN → message créneau pris", () => {
    expect(mapServerErrorToMessage({ error: "SLOT_TAKEN" })).toBe(
      TOAST_MESSAGES.errors.slotTaken,
    );
  });

  it("UNAUTHORIZED → message session expirée", () => {
    expect(mapServerErrorToMessage({ error: "UNAUTHORIZED" })).toBe(
      TOAST_MESSAGES.errors.unauthorized,
    );
  });

  it("BAD_REQUEST → message demande invalide", () => {
    expect(mapServerErrorToMessage({ error: "BAD_REQUEST" })).toBe(
      TOAST_MESSAGES.errors.badRequest,
    );
  });

  it("SERVER → message générique", () => {
    expect(mapServerErrorToMessage({ error: "SERVER" })).toBe(
      TOAST_MESSAGES.errors.server,
    );
  });

  it("code inconnu ou absent → message générique (fallback)", () => {
    expect(mapServerErrorToMessage({})).toBe(TOAST_MESSAGES.errors.server);
    expect(mapServerErrorToMessage({ error: "UNKNOWN_CODE" })).toBe(
      TOAST_MESSAGES.errors.server,
    );
  });
});
