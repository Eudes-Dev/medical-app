// @vitest-environment node
/**
 * Tests unitaires de la politique de délai de reprogrammation (story 8.1, AC 3).
 *
 * Couvre `canStillManage(startTime, now?)` :
 *  - RDV à > 24h ⇒ true (reprogrammable)
 *  - RDV à < 24h ⇒ false (trop proche)
 *  - bord exact (= 24h) ⇒ false (strictement plus de 24h requis)
 *  - RDV passé ⇒ false
 *
 * Comparaison sur l'instant absolu (insensible au fuseau) : `now` est injecté.
 */

import { describe, it, expect } from "vitest";
import {
  RESCHEDULE_MIN_NOTICE_HOURS,
  canStillManage,
} from "@/lib/booking/reschedule-policy";

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date("2026-06-04T12:00:00Z");

describe("canStillManage (story 8.1)", () => {
  it("la constante de délai minimum vaut 24 heures", () => {
    expect(RESCHEDULE_MIN_NOTICE_HOURS).toBe(24);
  });

  it("RDV à plus de 24h ⇒ true (reprogrammable)", () => {
    const start = new Date(NOW.getTime() + 25 * HOUR_MS);
    expect(canStillManage(start, NOW)).toBe(true);
  });

  it("RDV à moins de 24h ⇒ false (trop proche)", () => {
    const start = new Date(NOW.getTime() + 23 * HOUR_MS);
    expect(canStillManage(start, NOW)).toBe(false);
  });

  it("bord exact (= 24h pile) ⇒ false (strictement plus de 24h requis)", () => {
    const start = new Date(NOW.getTime() + 24 * HOUR_MS);
    expect(canStillManage(start, NOW)).toBe(false);
  });

  it("juste au-dessus de 24h (+1 ms) ⇒ true", () => {
    const start = new Date(NOW.getTime() + 24 * HOUR_MS + 1);
    expect(canStillManage(start, NOW)).toBe(true);
  });

  it("RDV déjà passé ⇒ false", () => {
    const start = new Date(NOW.getTime() - HOUR_MS);
    expect(canStillManage(start, NOW)).toBe(false);
  });

  it("est insensible au fuseau : comparaison sur l'instant absolu", () => {
    // Deux instants identiques exprimés différemment (offset) → même verdict.
    const start = new Date("2026-06-06T12:00:00+02:00"); // = 10:00:00Z
    const now = new Date("2026-06-05T09:00:00Z"); // 25h avant l'instant absolu
    expect(canStillManage(start, now)).toBe(true);
  });
});
