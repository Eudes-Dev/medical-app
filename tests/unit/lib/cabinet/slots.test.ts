/**
 * Tests unitaires de la génération / filtrage de créneaux.
 *
 * Migré vers l'API « plages » (story 7.1) : `generateDaySlots(date, ranges)`
 * et `filterAvailableSlots(date, appointments, ranges)` remplacent l'ancienne
 * génération basée sur `OpeningHours`.
 *
 * Depuis la story 5.3 (REL-001), les créneaux sont posés à leur heure murale
 * **`Europe/Paris`** indépendamment du fuseau du runner (UTC en CI). Les
 * assertions d'heure passent donc par `formatInTimeZone(..., "Europe/Paris")`
 * et non plus par `getHours()` (fuseau serveur).
 *
 * Couvre:
 * - `generateDaySlots`: une plage 08:00–18:00/30 → 20 créneaux ; deux plages
 *   avec pause déjeuner ; plage trop courte → 0 ; durée 45 sur 09:00–12:00 → 4
 * - `isOverlapping`: cas limites de chevauchement
 * - `filterAvailableSlots`: filtre selon des rendez-vous existants
 */

import { describe, expect, it } from "vitest";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  filterAvailableSlots,
  generateDaySlots,
  isOverlapping,
  type TimeOffInterval,
  type WorkingHourRange,
} from "@/lib/cabinet/slots";

const TZ = "Europe/Paris";
/** Heure murale "HH:mm" d'un instant, en heure de Paris (indépendant du runner). */
const hhmm = (d: Date) => formatInTimeZone(d, TZ, "HH:mm");
/** Instant UTC correspondant à une heure murale Paris le 2026-06-01. */
const parisOn = (h: number, m = 0) =>
  fromZonedTime(
    `2026-06-01T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
    TZ,
  );

const FULL_DAY: WorkingHourRange[] = [
  { startTime: "08:00", endTime: "18:00", slotDuration: 30 },
];
const DAY = new Date("2026-06-01T00:00:00");

describe("generateDaySlots", () => {
  it("génère 20 créneaux pour une plage 08:00–18:00 / 30 min", () => {
    const slots = generateDaySlots(DAY, FULL_DAY);
    expect(slots).toHaveLength(20);
  });

  it("le premier créneau est à 08:00 et le dernier à 17:30 (heure de Paris)", () => {
    const slots = generateDaySlots(DAY, FULL_DAY);
    expect(hhmm(slots[0].start)).toBe("08:00");
    expect(hhmm(slots.at(-1)!.start)).toBe("17:30");
    // La durée de la plage est portée par chaque créneau.
    expect(slots[0].slotMinutes).toBe(30);
  });

  it("respecte le jour passé en paramètre (jour de Paris)", () => {
    const day = new Date("2026-12-25T15:00:00");
    const [first] = generateDaySlots(day, FULL_DAY);
    expect(formatInTimeZone(first.start, TZ, "yyyy-MM-dd")).toBe("2026-12-25");
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
    expect(hhmm(slots[0].start)).toBe("08:00");
    expect(hhmm(slots.at(-1)!.start)).toBe("17:30");
    // Pas de créneau pendant la pause déjeuner (12:00–14:00).
    expect(
      slots.some((s) => {
        const h = Number(formatInTimeZone(s.start, TZ, "HH"));
        return h === 12 || h === 13;
      }),
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
    expect(hhmm(slots.at(-1)!.start)).toBe("11:15");
  });

  it("renvoie un tableau vide quand aucune plage n'est fournie (jour fermé)", () => {
    expect(generateDaySlots(DAY, [])).toHaveLength(0);
  });
});

describe("isOverlapping", () => {
  it("détecte un chevauchement exact (même start)", () => {
    const slot = parisOn(9, 0);
    const apt = { startTime: parisOn(9, 0), endTime: parisOn(9, 30) };
    expect(isOverlapping(slot, 30, apt)).toBe(true);
  });

  it("détecte un chevauchement partiel (RDV commence pendant le slot)", () => {
    const slot = parisOn(9, 0);
    const apt = { startTime: parisOn(9, 15), endTime: parisOn(9, 45) };
    expect(isOverlapping(slot, 30, apt)).toBe(true);
  });

  it("ne détecte pas de chevauchement quand les intervalles se touchent", () => {
    const slot = parisOn(9, 0);
    const apt = { startTime: parisOn(9, 30), endTime: parisOn(10, 0) };
    expect(isOverlapping(slot, 30, apt)).toBe(false);
  });

  it("ne détecte pas de chevauchement pour des intervalles séparés", () => {
    const slot = parisOn(9, 0);
    const apt = { startTime: parisOn(11, 0), endTime: parisOn(11, 30) };
    expect(isOverlapping(slot, 30, apt)).toBe(false);
  });
});

describe("filterAvailableSlots", () => {
  it("ne retire aucun créneau quand il n'y a pas de RDV", () => {
    expect(filterAvailableSlots(DAY, [], FULL_DAY)).toHaveLength(20);
  });

  it("retire le créneau 09:00 quand un RDV de 30min s'y trouve", () => {
    const apt = { startTime: parisOn(9, 0), endTime: parisOn(9, 30) };
    const slots = filterAvailableSlots(DAY, [apt], FULL_DAY);
    expect(slots).toHaveLength(19);
    expect(slots.some((s) => hhmm(s.start) === "09:00")).toBe(false);
  });

  it("bloque 2 créneaux consécutifs pour un RDV de 45min (10:00-10:45)", () => {
    const apt = { startTime: parisOn(10, 0), endTime: parisOn(10, 45) };
    const slots = filterAvailableSlots(DAY, [apt], FULL_DAY);
    expect(slots).toHaveLength(18);
    expect(slots.some((s) => hhmm(s.start) === "10:00")).toBe(false);
    expect(slots.some((s) => hhmm(s.start) === "10:30")).toBe(false);
    expect(slots.some((s) => hhmm(s.start) === "11:00")).toBe(true);
  });

  // ------------------------------------------------------------------------
  // Story 7.2 — composition avec les exceptions `TimeOff`
  // ------------------------------------------------------------------------

  it("sans `timeOffs` (4e arg absent) : comportement 7.1 inchangé (non-régression)", () => {
    // Appel à 3 arguments doit rester valide et renvoyer le même résultat.
    const slots = filterAvailableSlots(DAY, [], FULL_DAY);
    expect(slots).toHaveLength(20);
  });

  it("renvoie [] si une exception `allDay` couvre le jour", () => {
    const off: TimeOffInterval = {
      startDate: DAY,
      endDate: DAY,
      allDay: true,
      startTime: null,
      endTime: null,
    };
    expect(filterAvailableSlots(DAY, [], FULL_DAY, [off])).toEqual([]);
  });

  it("retire les créneaux du midi quand une plage 12:00-14:00 est bloquée", () => {
    const off: TimeOffInterval = {
      startDate: DAY,
      endDate: DAY,
      allDay: false,
      startTime: "12:00",
      endTime: "14:00",
    };
    const slots = filterAvailableSlots(DAY, [], FULL_DAY, [off]);
    // 4 créneaux retirés : 12:00, 12:30, 13:00, 13:30 ⇒ 16 restants
    expect(slots).toHaveLength(16);
    expect(
      slots.some((s) => {
        const h = Number(formatInTimeZone(s.start, TZ, "HH"));
        return h === 12 || h === 13;
      }),
    ).toBe(false);
  });

  it("une exception sur un autre jour n'affecte pas le résultat", () => {
    const off: TimeOffInterval = {
      startDate: new Date("2026-06-02T00:00:00"),
      endDate: new Date("2026-06-02T00:00:00"),
      allDay: true,
      startTime: null,
      endTime: null,
    };
    expect(filterAvailableSlots(DAY, [], FULL_DAY, [off])).toHaveLength(20);
  });
});
