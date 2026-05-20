/**
 * Tests unitaires de `guestBookingSchema` (Story 4.2).
 *
 * Couvre :
 * - Cas nominal valide (10 chiffres FR + variante +33)
 * - Tous les cas d'échec (firstName/lastName trop courts, phone US, email invalide,
 *   slot dans le passé / mal formé)
 * - Normalisation (lowercase email, trim).
 */

import { addHours, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { guestBookingSchema } from "@/lib/validations/booking";

const futureSlot = () => addHours(new Date(), 24).toISOString();

const validInput = () => ({
  firstName: "Jean",
  lastName: "Martin",
  phone: "0612345678",
  email: "Jean.Martin@Email.com",
  slotISO: futureSlot(),
});

describe("guestBookingSchema", () => {
  it("accepte un payload valide et normalise l'email en lowercase", () => {
    const result = guestBookingSchema.safeParse(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jean.martin@email.com");
    }
  });

  it("accepte un téléphone au format +33", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      phone: "+33 6 12 34 56 78",
    });
    expect(result.success).toBe(true);
  });

  it("refuse un téléphone au format US", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      phone: "+1 415 555 0100",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un prénom trop court (1 caractère)", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      firstName: "J",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un nom trop court", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      lastName: "M",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un email invalide", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      email: "pas-un-email",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un slotISO dans le passé", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      slotISO: subDays(new Date(), 1).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("refuse un slotISO mal formé (sans offset)", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      slotISO: "2030-01-01 10:00:00",
    });
    expect(result.success).toBe(false);
  });

  it("trim les espaces en prénom / nom", () => {
    const result = guestBookingSchema.safeParse({
      ...validInput(),
      firstName: "  Jean  ",
      lastName: "  Martin  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.lastName).toBe("Martin");
    }
  });
});
