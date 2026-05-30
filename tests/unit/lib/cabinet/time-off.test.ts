/**
 * Tests unitaires des helpers de composition `TimeOff × créneaux` (story 7.2).
 *
 * Couvre :
 * - `isDayFullyBlocked` : dans / hors plage, bornes inclusives, ignorance des
 *   exceptions partielles.
 * - `slotInPartialTimeOff` : chevauchement, adjacence non bloquante, jour
 *   différent ignoré.
 * - `dayKey` : indépendance de l'heure.
 */

import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import {
  dayKey,
  isDayFullyBlocked,
  isSameOrAfterDay,
  isSameOrBeforeDay,
  slotInPartialTimeOff,
  type TimeOffInterval,
} from "@/lib/cabinet/time-off";

const TZ = "Europe/Paris";
const dayAt = (y: number, m: number, d: number) => new Date(y, m - 1, d);
/** Instant UTC d'une heure murale Paris (story 5.3 — TZ-robuste sur runner UTC). */
const parisAt = (iso: string) => fromZonedTime(iso, TZ);

describe("dayKey", () => {
  it("est insensible à l'heure de la journée (même jour de Paris)", () => {
    // Deux instants du même jour **de Paris** doivent partager la clé.
    expect(dayKey(parisAt("2026-05-15T00:00:00"))).toBe(
      dayKey(parisAt("2026-05-15T23:59:00")),
    );
  });

  it("est strictement croissant entre deux jours consécutifs", () => {
    expect(dayKey(dayAt(2026, 5, 15))).toBeLessThan(dayKey(dayAt(2026, 5, 16)));
  });
});

describe("isSameOrAfterDay / isSameOrBeforeDay", () => {
  it("traite l'égalité comme vraie (bornes inclusives)", () => {
    const a = dayAt(2026, 6, 1);
    expect(isSameOrAfterDay(a, a)).toBe(true);
    expect(isSameOrBeforeDay(a, a)).toBe(true);
  });
});

describe("isDayFullyBlocked", () => {
  const off: TimeOffInterval = {
    startDate: dayAt(2026, 6, 1),
    endDate: dayAt(2026, 6, 5),
    allDay: true,
    startTime: null,
    endTime: null,
  };

  it("vrai pour les jours dans la plage (bornes inclusives)", () => {
    expect(isDayFullyBlocked(dayAt(2026, 6, 1), [off])).toBe(true);
    expect(isDayFullyBlocked(dayAt(2026, 6, 3), [off])).toBe(true);
    expect(isDayFullyBlocked(dayAt(2026, 6, 5), [off])).toBe(true);
  });

  it("faux pour les jours hors de la plage", () => {
    expect(isDayFullyBlocked(dayAt(2026, 5, 31), [off])).toBe(false);
    expect(isDayFullyBlocked(dayAt(2026, 6, 6), [off])).toBe(false);
  });

  it("ignore une exception partielle (non-allDay) couvrant le même jour", () => {
    const partial: TimeOffInterval = {
      startDate: dayAt(2026, 6, 1),
      endDate: dayAt(2026, 6, 1),
      allDay: false,
      startTime: "12:00",
      endTime: "14:00",
    };
    expect(isDayFullyBlocked(dayAt(2026, 6, 1), [partial])).toBe(false);
  });

  it("retourne false sur une liste vide", () => {
    expect(isDayFullyBlocked(dayAt(2026, 6, 1), [])).toBe(false);
  });
});

describe("slotInPartialTimeOff", () => {
  const partial: TimeOffInterval = {
    startDate: dayAt(2026, 6, 1),
    endDate: dayAt(2026, 6, 1),
    allDay: false,
    startTime: "12:00",
    endTime: "14:00",
  };
  // Heure murale Paris du 2026-06-01 (story 5.3 — `slotInPartialTimeOff`
  // compare en heure de Paris, indépendamment du fuseau du runner).
  const slotAt = (h: number, m = 0) =>
    parisAt(
      `2026-06-01T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
    );

  it("bloque un créneau qui démarre dans la plage", () => {
    expect(slotInPartialTimeOff(slotAt(12, 30), 30, [partial])).toBe(true);
  });

  it("bloque un créneau qui chevauche le début (déborde)", () => {
    // 11:45-12:15 chevauche 12:00-14:00
    expect(slotInPartialTimeOff(slotAt(11, 45), 30, [partial])).toBe(true);
  });

  it("ne bloque pas un créneau strictement adjacent", () => {
    // 11:30-12:00 termine à la borne de début → pas de chevauchement strict
    expect(slotInPartialTimeOff(slotAt(11, 30), 30, [partial])).toBe(false);
    // 14:00-14:30 démarre à la borne de fin → pas de chevauchement strict
    expect(slotInPartialTimeOff(slotAt(14, 0), 30, [partial])).toBe(false);
  });

  it("ignore une exception sur un autre jour", () => {
    const other = new Date(2026, 5, 2, 12, 30);
    expect(slotInPartialTimeOff(other, 30, [partial])).toBe(false);
  });

  it("ignore les exceptions allDay (gérées par isDayFullyBlocked)", () => {
    const allDay: TimeOffInterval = {
      ...partial,
      allDay: true,
      startTime: null,
      endTime: null,
    };
    expect(slotInPartialTimeOff(slotAt(12, 30), 30, [allDay])).toBe(false);
  });
});
