/**
 * Tests unitaires du schéma Zod `serviceTypeSchema` (story 7.3, AC 8).
 */

import { describe, it, expect } from "vitest";
import {
  serviceTypeSchema,
  SERVICE_DURATIONS,
} from "@/lib/validations/service-type";

const valid = () => ({
  label: "Première consultation",
  durationMin: 30,
  color: "emerald" as const,
  price: 50,
  description: "Bilan initial complet.",
  isPublic: true,
  active: true,
});

describe("serviceTypeSchema", () => {
  it("valide un type de soin complet correct", () => {
    expect(serviceTypeSchema.safeParse(valid()).success).toBe(true);
  });

  it("accepte un service privé sans tarif ni description", () => {
    const res = serviceTypeSchema.safeParse({
      label: "Urgence interne",
      durationMin: 15,
      color: "rose",
      isPublic: false,
      active: true,
    });
    expect(res.success).toBe(true);
  });

  it("accepte toutes les durées autorisées", () => {
    for (const durationMin of SERVICE_DURATIONS) {
      expect(
        serviceTypeSchema.safeParse({ ...valid(), durationMin }).success,
      ).toBe(true);
    }
  });

  it("rejette un libellé trop court (< 2)", () => {
    const res = serviceTypeSchema.safeParse({ ...valid(), label: "A" });
    expect(res.success).toBe(false);
  });

  it("rejette un libellé trop long (> 60)", () => {
    const res = serviceTypeSchema.safeParse({
      ...valid(),
      label: "x".repeat(61),
    });
    expect(res.success).toBe(false);
  });

  it("rejette une durée hors enum (20 min)", () => {
    const res = serviceTypeSchema.safeParse({ ...valid(), durationMin: 20 });
    expect(res.success).toBe(false);
  });

  it("rejette une couleur hors palette", () => {
    const res = serviceTypeSchema.safeParse({ ...valid(), color: "magenta" });
    expect(res.success).toBe(false);
  });

  it("rejette un tarif négatif", () => {
    const res = serviceTypeSchema.safeParse({ ...valid(), price: -5 });
    expect(res.success).toBe(false);
  });

  it("rejette un tarif avec plus de 2 décimales", () => {
    const res = serviceTypeSchema.safeParse({ ...valid(), price: 19.999 });
    expect(res.success).toBe(false);
  });

  it("accepte un tarif à 2 décimales", () => {
    expect(serviceTypeSchema.safeParse({ ...valid(), price: 19.99 }).success).toBe(
      true,
    );
  });

  it("rejette une description de plus de 500 caractères", () => {
    const res = serviceTypeSchema.safeParse({
      ...valid(),
      description: "x".repeat(501),
    });
    expect(res.success).toBe(false);
  });

  it("trim le libellé", () => {
    const res = serviceTypeSchema.safeParse({ ...valid(), label: "  Suivi  " });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.label).toBe("Suivi");
  });
});
