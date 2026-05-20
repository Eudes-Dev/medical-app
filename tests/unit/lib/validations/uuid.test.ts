import { describe, it, expect } from "vitest";

import { uuidSchema, assertValidUuid } from "@/lib/validations/uuid";
import { BadRequestError } from "@/lib/errors";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("lib/validations/uuid", () => {
  it("assertValidUuid accepte un UUID v4 valide", () => {
    expect(() => assertValidUuid(VALID_UUID)).not.toThrow();
  });

  it("assertValidUuid throw BadRequestError pour un UUID malformé", () => {
    expect(() => assertValidUuid("not-a-uuid")).toThrow(BadRequestError);
  });

  it("assertValidUuid throw BadRequestError pour une chaîne vide", () => {
    expect(() => assertValidUuid("")).toThrow(BadRequestError);
  });

  it("uuidSchema.safeParse retourne success: false pour un input invalide", () => {
    const result = uuidSchema.safeParse("abc");
    expect(result.success).toBe(false);
  });

  it("uuidSchema.safeParse retourne success: true pour un UUID valide", () => {
    const result = uuidSchema.safeParse(VALID_UUID);
    expect(result.success).toBe(true);
  });
});
