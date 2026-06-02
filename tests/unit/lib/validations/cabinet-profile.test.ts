/**
 * Tests unitaires du schéma Zod `cabinetProfileSchema` (story 7.4, AC 7).
 *
 * Couverture : bornes des champs, `phone` FR invalide rejeté, `email` invalide
 * rejeté, cas valides (champs optionnels absents / vides → undefined).
 */

import { describe, it, expect } from "vitest";
import { cabinetProfileSchema } from "@/lib/validations/cabinet-profile";

const valid = () => ({
  name: "Cabinet Médical",
  address: "12 rue de la Santé, 75014 Paris",
  phone: "01 23 45 67 89",
});

describe("cabinetProfileSchema", () => {
  it("accepte un profil minimal valide (optionnels absents)", () => {
    const res = cabinetProfileSchema.safeParse(valid());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.tagline).toBeUndefined();
      expect(res.data.description).toBeUndefined();
      expect(res.data.email).toBeUndefined();
      expect(res.data.accessInfo).toBeUndefined();
    }
  });

  it("trim le nom et l'adresse", () => {
    const res = cabinetProfileSchema.safeParse({
      ...valid(),
      name: "  Cabinet  ",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toBe("Cabinet");
  });

  // --- name ---
  it("rejette un nom trop court (< 2)", () => {
    expect(cabinetProfileSchema.safeParse({ ...valid(), name: "A" }).success).toBe(
      false,
    );
  });

  it("rejette un nom trop long (> 80)", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), name: "a".repeat(81) }).success,
    ).toBe(false);
  });

  // --- address ---
  it("rejette une adresse trop longue (> 200)", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), address: "a".repeat(201) })
        .success,
    ).toBe(false);
  });

  // --- phone ---
  it("rejette un téléphone invalide", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), phone: "pas un numéro" }).success,
    ).toBe(false);
  });

  it("accepte un mobile FR", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), phone: "06 12 34 56 78" }).success,
    ).toBe(true);
  });

  it("rejette un téléphone vide", () => {
    expect(cabinetProfileSchema.safeParse({ ...valid(), phone: "" }).success).toBe(
      false,
    );
  });

  // --- email ---
  it("rejette un e-mail invalide", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), email: "pas-un-email" }).success,
    ).toBe(false);
  });

  it("accepte un e-mail valide", () => {
    const res = cabinetProfileSchema.safeParse({
      ...valid(),
      email: "contact@cabinet.fr",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBe("contact@cabinet.fr");
  });

  it("traite un e-mail vide comme absent (undefined)", () => {
    const res = cabinetProfileSchema.safeParse({ ...valid(), email: "" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toBeUndefined();
  });

  // --- optionnels longueur ---
  it("rejette une accroche trop longue (> 120)", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), tagline: "a".repeat(121) })
        .success,
    ).toBe(false);
  });

  it("rejette une présentation trop longue (> 1000)", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), description: "a".repeat(1001) })
        .success,
    ).toBe(false);
  });

  it("rejette des infos d'accès trop longues (> 500)", () => {
    expect(
      cabinetProfileSchema.safeParse({ ...valid(), accessInfo: "a".repeat(501) })
        .success,
    ).toBe(false);
  });
});
