/**
 * Tests unitaires de la logique de génération / filtrage de créneaux
 * (Story 4.1, Task 8).
 *
 * Couvre:
 * - `generateSlots`: nombre et bornes pour des horaires 8h-18h, 30min
 * - `isOverlapping`: cas limites de chevauchement
 * - `filterAvailableSlots`: filtre selon des rendez-vous existants
 */

import { describe, expect, it } from "vitest";
import {
  filterAvailableSlots,
  generateSlots,
  isOverlapping,
} from "@/lib/cabinet/slots";

const DEFAULT_HOURS = { start: 8, end: 18, slotMinutes: 30 } as const;
const DAY = new Date("2026-06-01T00:00:00");

describe("generateSlots", () => {
  it("génère 20 créneaux pour 8h-18h en pas de 30min", () => {
    const slots = generateSlots(DAY, DEFAULT_HOURS);
    expect(slots).toHaveLength(20);
  });

  it("le premier créneau est à 08:00 et le dernier à 17:30", () => {
    const slots = generateSlots(DAY, DEFAULT_HOURS);
    expect(slots[0].getHours()).toBe(8);
    expect(slots[0].getMinutes()).toBe(0);
    expect(slots.at(-1)!.getHours()).toBe(17);
    expect(slots.at(-1)!.getMinutes()).toBe(30);
  });

  it("respecte le jour passé en paramètre", () => {
    const day = new Date("2026-12-25T15:00:00");
    const [first] = generateSlots(day, DEFAULT_HOURS);
    expect(first.getFullYear()).toBe(2026);
    expect(first.getMonth()).toBe(11);
    expect(first.getDate()).toBe(25);
  });
});

describe("isOverlapping", () => {
  it("détecte un chevauchement exact (même start)", () => {
    const slot = new Date("2026-06-01T09:00:00");
    const apt = {
      startTime: new Date("2026-06-01T09:00:00"),
      endTime: new Date("2026-06-01T09:30:00"),
    };
    expect(isOverlapping(slot, 30, apt)).toBe(true);
  });

  it("détecte un chevauchement partiel (RDV commence pendant le slot)", () => {
    const slot = new Date("2026-06-01T09:00:00");
    const apt = {
      startTime: new Date("2026-06-01T09:15:00"),
      endTime: new Date("2026-06-01T09:45:00"),
    };
    expect(isOverlapping(slot, 30, apt)).toBe(true);
  });

  it("ne détecte pas de chevauchement quand les intervalles se touchent", () => {
    // Slot 09:00-09:30, RDV 09:30-10:00 → adjacents, pas de chevauchement.
    const slot = new Date("2026-06-01T09:00:00");
    const apt = {
      startTime: new Date("2026-06-01T09:30:00"),
      endTime: new Date("2026-06-01T10:00:00"),
    };
    expect(isOverlapping(slot, 30, apt)).toBe(false);
  });

  it("ne détecte pas de chevauchement pour des intervalles séparés", () => {
    const slot = new Date("2026-06-01T09:00:00");
    const apt = {
      startTime: new Date("2026-06-01T11:00:00"),
      endTime: new Date("2026-06-01T11:30:00"),
    };
    expect(isOverlapping(slot, 30, apt)).toBe(false);
  });
});

describe("filterAvailableSlots", () => {
  it("ne retire aucun créneau quand il n'y a pas de RDV", () => {
    const slots = filterAvailableSlots(DAY, [], DEFAULT_HOURS);
    expect(slots).toHaveLength(20);
  });

  it("retire le créneau 09:00 quand un RDV CONFIRMED de 30min s'y trouve", () => {
    const apt = {
      startTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 9, 0),
      endTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 9, 30),
    };
    const slots = filterAvailableSlots(DAY, [apt], DEFAULT_HOURS);
    expect(slots).toHaveLength(19);
    expect(
      slots.some((s) => s.getHours() === 9 && s.getMinutes() === 0),
    ).toBe(false);
  });

  it("bloque 2 créneaux consécutifs pour un RDV de 45min (10:00-10:45)", () => {
    const apt = {
      startTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 10, 0),
      endTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 10, 45),
    };
    const slots = filterAvailableSlots(DAY, [apt], DEFAULT_HOURS);
    expect(slots).toHaveLength(18);
    expect(
      slots.some((s) => s.getHours() === 10 && s.getMinutes() === 0),
    ).toBe(false);
    expect(
      slots.some((s) => s.getHours() === 10 && s.getMinutes() === 30),
    ).toBe(false);
    // 11:00 reste disponible.
    expect(
      slots.some((s) => s.getHours() === 11 && s.getMinutes() === 0),
    ).toBe(true);
  });
});
