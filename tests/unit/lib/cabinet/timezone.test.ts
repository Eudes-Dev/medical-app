/**
 * Tests du fuseau horaire cabinet (`Europe/Paris`) — story 5.3 (REL-001).
 *
 * Preuve que la génération de créneaux produit des instants **corrects** quel
 * que soit le fuseau du serveur. Les assertions portent sur les valeurs **UTC**
 * (`toISOString` / `getUTCHours`) qui sont, par construction, indépendantes du
 * fuseau du process — le runner CI tourne d'ailleurs en UTC, ce qui reproduit
 * exactement l'environnement Vercel.
 *
 * Couvre CET (hiver, UTC+1) **et** CEST (été, UTC+2).
 */

import { describe, expect, it } from "vitest";
import {
  slotInstant,
  zonedMinutes,
  zonedDayKey,
  zonedDayOfWeek,
  zonedDayBoundsUtc,
} from "@/lib/cabinet/timezone";
import { generateDaySlots, type WorkingHourRange } from "@/lib/cabinet/slots";

const FULL_DAY: WorkingHourRange[] = [
  { startTime: "08:00", endTime: "18:00", slotDuration: 30 },
];

// Un instant de référence par saison (jour désigné, heure indifférente).
const WINTER = new Date("2026-01-15T00:00:00Z"); // CET, UTC+1
const SUMMER = new Date("2026-07-15T00:00:00Z"); // CEST, UTC+2

describe("slotInstant — heure murale Paris → instant UTC", () => {
  it("CET (hiver) : 10:00 Paris = 09:00 UTC", () => {
    expect(slotInstant(WINTER, 10 * 60).toISOString()).toBe(
      "2026-01-15T09:00:00.000Z",
    );
  });

  it("CEST (été) : 10:00 Paris = 08:00 UTC", () => {
    expect(slotInstant(SUMMER, 10 * 60).toISOString()).toBe(
      "2026-07-15T08:00:00.000Z",
    );
  });

  it("le décalage saisonnier (CET→CEST) est géré automatiquement", () => {
    // Même heure murale (08:00), décalage UTC différent selon la saison.
    expect(slotInstant(WINTER, 8 * 60).getUTCHours()).toBe(7); // 08:00 - 1h
    expect(slotInstant(SUMMER, 8 * 60).getUTCHours()).toBe(6); // 08:00 - 2h
  });
});

describe("zonedMinutes — extraction heure murale Paris", () => {
  it("relit l'heure murale posée par slotInstant (aller-retour)", () => {
    expect(zonedMinutes(slotInstant(WINTER, 600))).toBe(600);
    expect(zonedMinutes(slotInstant(SUMMER, 600))).toBe(600);
  });

  it("un instant UTC est lu en heure de Paris (et non en heure serveur)", () => {
    // 08:00 UTC en été = 10:00 Paris (CEST).
    expect(zonedMinutes(new Date("2026-07-15T08:00:00Z"))).toBe(600);
    // 09:00 UTC en hiver = 10:00 Paris (CET).
    expect(zonedMinutes(new Date("2026-01-15T09:00:00Z"))).toBe(600);
  });
});

describe("zonedDayKey / zonedDayOfWeek", () => {
  it("classe un instant tardif UTC dans le bon jour de Paris", () => {
    // 23:30 UTC le 15/07 = 01:30 Paris le 16/07 (CEST) → jour de Paris = 16.
    // (dayKey encode (month-1)*100 : juillet=6 → 2026·10000 + 600 + 16.)
    expect(zonedDayKey(new Date("2026-07-15T23:30:00Z"))).toBe(20260616);
  });

  it("jour de semaine en heure de Paris (2026-07-15 = mercredi)", () => {
    // 0=dimanche … 3=mercredi.
    expect(zonedDayOfWeek(SUMMER)).toBe(3);
  });
});

describe("zonedDayBoundsUtc — bornes du jour de Paris en UTC", () => {
  it("CET (hiver) : [23:00 J-1, 23:00 J] UTC", () => {
    const { startUtc, endUtc } = zonedDayBoundsUtc(WINTER);
    expect(startUtc.toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-01-15T23:00:00.000Z");
  });

  it("CEST (été) : [22:00 J-1, 22:00 J] UTC", () => {
    const { startUtc, endUtc } = zonedDayBoundsUtc(SUMMER);
    expect(startUtc.toISOString()).toBe("2026-07-14T22:00:00.000Z");
    expect(endUtc.toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });
});

describe("generateDaySlots — créneaux Paris indépendants du fuseau serveur", () => {
  it("CET (hiver) : premier créneau 08:00 Paris = 07:00 UTC", () => {
    const slots = generateDaySlots(WINTER, FULL_DAY);
    expect(slots[0].start.toISOString()).toBe("2026-01-15T07:00:00.000Z");
    expect(slots.at(-1)!.start.toISOString()).toBe("2026-01-15T16:30:00.000Z");
  });

  it("CEST (été) : premier créneau 08:00 Paris = 06:00 UTC", () => {
    const slots = generateDaySlots(SUMMER, FULL_DAY);
    expect(slots[0].start.toISOString()).toBe("2026-07-15T06:00:00.000Z");
    expect(slots.at(-1)!.start.toISOString()).toBe("2026-07-15T15:30:00.000Z");
  });
});
