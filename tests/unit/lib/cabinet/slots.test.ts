/**
 * Tests unitaires de la génération / filtrage de créneaux.
 *
 * Migré vers l'API « plages » (story 7.1) : `generateDaySlots(date, ranges)`
 * et `filterAvailableSlots(date, appointments, ranges)` remplacent l'ancienne
 * génération basée sur `OpeningHours`.
 *
 * Couvre:
 * - `generateDaySlots`: une plage 08:00–18:00/30 → 20 créneaux ; deux plages
 *   avec pause déjeuner ; plage trop courte → 0 ; durée 45 sur 09:00–12:00 → 4
 * - `isOverlapping`: cas limites de chevauchement
 * - `filterAvailableSlots`: filtre selon des rendez-vous existants
 */

import { describe, expect, it } from "vitest";
import {
  filterAvailableSlots,
  generateDaySlots,
  isOverlapping,
  type WorkingHourRange,
} from "@/lib/cabinet/slots";

const FULL_DAY: WorkingHourRange[] = [
  { startTime: "08:00", endTime: "18:00", slotDuration: 30 },
];
const DAY = new Date("2026-06-01T00:00:00");

describe("generateDaySlots", () => {
  it("génère 20 créneaux pour une plage 08:00–18:00 / 30 min", () => {
    const slots = generateDaySlots(DAY, FULL_DAY);
    expect(slots).toHaveLength(20);
  });

  it("le premier créneau est à 08:00 et le dernier à 17:30", () => {
    const slots = generateDaySlots(DAY, FULL_DAY);
    expect(slots[0].start.getHours()).toBe(8);
    expect(slots[0].start.getMinutes()).toBe(0);
    expect(slots.at(-1)!.start.getHours()).toBe(17);
    expect(slots.at(-1)!.start.getMinutes()).toBe(30);
    // La durée de la plage est portée par chaque créneau.
    expect(slots[0].slotMinutes).toBe(30);
  });

  it("respecte le jour passé en paramètre", () => {
    const day = new Date("2026-12-25T15:00:00");
    const [first] = generateDaySlots(day, FULL_DAY);
    expect(first.start.getFullYear()).toBe(2026);
    expect(first.start.getMonth()).toBe(11);
    expect(first.start.getDate()).toBe(25);
  });

  it("gère deux plages avec pause déjeuner et trie les créneaux", () => {
    // 08:00–12:00 / 30 → 8 créneaux ; 14:00–18:00 / 30 → 8 créneaux = 16.
    const ranges: WorkingHourRange[] = [
      { startTime: "14:00", endTime: "18:00", slotDuration: 30 },
      { startTime: "08:00", endTime: "12:00", slotDuration: 30 },
    ];
    const slots = generateDaySlots(DAY, ranges);
    expect(slots).toHaveLength(16);
    // Tri chronologique malgré l'ordre d'entrée inversé.
    expect(slots[0].start.getHours()).toBe(8);
    expect(slots.at(-1)!.start.getHours()).toBe(17);
    expect(slots.at(-1)!.start.getMinutes()).toBe(30);
    // Pas de créneau pendant la pause déjeuner (12:00–14:00).
    expect(
      slots.some((s) => s.start.getHours() === 12 || s.start.getHours() === 13),
    ).toBe(false);
  });

  it("ne génère aucun créneau pour une plage trop courte (amplitude < slotDuration)", () => {
    const ranges: WorkingHourRange[] = [
      { startTime: "09:00", endTime: "09:20", slotDuration: 30 },
    ];
    expect(generateDaySlots(DAY, ranges)).toHaveLength(0);
  });

  it("génère 4 créneaux pour 09:00–12:00 en pas de 45 min", () => {
    // 09:00, 09:45, 10:30, 11:15 → 4 créneaux (12:00 atteint mais 11:15+45=12:00 ok ; 12:00+45 dépasse).
    const ranges: WorkingHourRange[] = [
      { startTime: "09:00", endTime: "12:00", slotDuration: 45 },
    ];
    const slots = generateDaySlots(DAY, ranges);
    expect(slots).toHaveLength(4);
    expect(slots.at(-1)!.start.getHours()).toBe(11);
    expect(slots.at(-1)!.start.getMinutes()).toBe(15);
  });

  it("renvoie un tableau vide quand aucune plage n'est fournie (jour fermé)", () => {
    expect(generateDaySlots(DAY, [])).toHaveLength(0);
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
    expect(filterAvailableSlots(DAY, [], FULL_DAY)).toHaveLength(20);
  });

  it("retire le créneau 09:00 quand un RDV de 30min s'y trouve", () => {
    const apt = {
      startTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 9, 0),
      endTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 9, 30),
    };
    const slots = filterAvailableSlots(DAY, [apt], FULL_DAY);
    expect(slots).toHaveLength(19);
    expect(
      slots.some((s) => s.start.getHours() === 9 && s.start.getMinutes() === 0),
    ).toBe(false);
  });

  it("bloque 2 créneaux consécutifs pour un RDV de 45min (10:00-10:45)", () => {
    const apt = {
      startTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 10, 0),
      endTime: new Date(DAY.getFullYear(), DAY.getMonth(), DAY.getDate(), 10, 45),
    };
    const slots = filterAvailableSlots(DAY, [apt], FULL_DAY);
    expect(slots).toHaveLength(18);
    expect(
      slots.some((s) => s.start.getHours() === 10 && s.start.getMinutes() === 0),
    ).toBe(false);
    expect(
      slots.some((s) => s.start.getHours() === 10 && s.start.getMinutes() === 30),
    ).toBe(false);
    expect(
      slots.some((s) => s.start.getHours() === 11 && s.start.getMinutes() === 0),
    ).toBe(true);
  });
});
