/**
 * Tests unitaires du mapping position → créneau (Story 8.2, Task 1 / AC 3, 4, 9).
 *
 * Couvre les fonctions pures `pointToSlot`, `timeToSlotIndex` et `isSameSlot`
 * (logique testable hors DOM). La résolution DOM `resolveDropTarget` est
 * couverte par le test component (géométrie mockée).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";

import {
  pointToSlot,
  timeToSlotIndex,
  isSameSlot,
  resolveDropTarget,
} from "@/components/calendar/drag-utils";
import {
  SLOT_COUNT,
  SLOT_HEIGHT_PX,
} from "@/components/calendar/calendar-utils";

describe("drag-utils (Story 8.2)", () => {
  describe("pointToSlot", () => {
    it("Y = 0 → créneau 0 (8h00)", () => {
      expect(pointToSlot(0)).toBe(0);
    });

    it("snap : un Y intermédiaire dans le créneau 0 reste 0", () => {
      expect(pointToSlot(SLOT_HEIGHT_PX - 1)).toBe(0); // 29px → slot 0
      expect(pointToSlot(1)).toBe(0);
    });

    it("Y = SLOT_HEIGHT_PX → créneau 1 (8h30)", () => {
      expect(pointToSlot(SLOT_HEIGHT_PX)).toBe(1); // 30px → slot 1
      expect(pointToSlot(SLOT_HEIGHT_PX + 14)).toBe(1); // 44px → slot 1
    });

    it("dernier créneau valide (23, 19h30)", () => {
      const lastSlot = SLOT_COUNT - 1;
      expect(pointToSlot(lastSlot * SLOT_HEIGHT_PX)).toBe(lastSlot); // 690px
      expect(pointToSlot(SLOT_COUNT * SLOT_HEIGHT_PX - 1)).toBe(lastSlot); // 719px
    });

    it("Y négatif → null (au-dessus de la zone)", () => {
      expect(pointToSlot(-1)).toBeNull();
      expect(pointToSlot(-100)).toBeNull();
    });

    it("Y au-delà de la zone (≥ 720px) → null (hors zone, dépôt annulé)", () => {
      expect(pointToSlot(SLOT_COUNT * SLOT_HEIGHT_PX)).toBeNull(); // 720px exactement
      expect(pointToSlot(SLOT_COUNT * SLOT_HEIGHT_PX + 50)).toBeNull();
    });

    it("valeur non finie → null", () => {
      expect(pointToSlot(Number.NaN)).toBeNull();
      expect(pointToSlot(Number.POSITIVE_INFINITY)).toBeNull();
    });
  });

  describe("timeToSlotIndex", () => {
    it("8h00 → 0, 8h30 → 1, 9h00 → 2", () => {
      expect(timeToSlotIndex(new Date(2026, 5, 4, 8, 0))).toBe(0);
      expect(timeToSlotIndex(new Date(2026, 5, 4, 8, 30))).toBe(1);
      expect(timeToSlotIndex(new Date(2026, 5, 4, 9, 0))).toBe(2);
    });

    it("19h30 → 23 (dernier créneau)", () => {
      expect(timeToSlotIndex(new Date(2026, 5, 4, 19, 30))).toBe(23);
    });

    it("minutes intermédiaires snap au créneau courant (8h15 → 0)", () => {
      expect(timeToSlotIndex(new Date(2026, 5, 4, 8, 15))).toBe(0);
      expect(timeToSlotIndex(new Date(2026, 5, 4, 8, 45))).toBe(1);
    });
  });

  describe("isSameSlot (no-op AC 4)", () => {
    const origin = new Date(2026, 5, 4, 10, 0); // 4 juin 2026, 10h00 → slot 4

    it("même jour + même créneau → true (no-op)", () => {
      expect(isSameSlot(origin, new Date(2026, 5, 4), 4)).toBe(true);
    });

    it("même jour, créneau différent → false", () => {
      expect(isSameSlot(origin, new Date(2026, 5, 4), 5)).toBe(false);
    });

    it("jour différent, même index de créneau → false", () => {
      expect(isSameSlot(origin, new Date(2026, 5, 5), 4)).toBe(false);
    });
  });

  // QA fix TEST-001 : la logique de résolution DOM (closest + offsetY + parse +
  // neutralisation de la carte tirée) est testée ici avec une géométrie mockée.
  // jsdom ne calcule pas la mise en page réelle ; le verrouillage du drag
  // inter-jours « pixel-parfait » reste un E2E Playwright (story 3.6).
  describe("resolveDropTarget (résolution DOM)", () => {
    const COLUMN_TOP = 100;
    // jsdom n'implémente pas `elementFromPoint` → on l'assigne directement
    // (vi.spyOn échoue sur une propriété inexistante) et on restaure après.
    const originalEfp = document.elementFromPoint;

    function stubElementFromPoint(impl: () => Element | null) {
      (document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint =
        vi.fn(impl);
      return document.elementFromPoint as unknown as ReturnType<typeof vi.fn>;
    }

    afterEach(() => {
      document.body.innerHTML = "";
      (document as unknown as { elementFromPoint: unknown }).elementFromPoint = originalEfp;
    });

    /** Crée une colonne `[data-day-key]` à `top=COLUMN_TOP`, hauteur 720px. */
    function makeColumn(dayKey: string): HTMLElement {
      const column = document.createElement("div");
      column.setAttribute("data-day-key", dayKey);
      column.getBoundingClientRect = () =>
        ({
          top: COLUMN_TOP,
          left: 0,
          bottom: COLUMN_TOP + SLOT_COUNT * SLOT_HEIGHT_PX,
          right: 200,
          width: 200,
          height: SLOT_COUNT * SLOT_HEIGHT_PX,
          x: 0,
          y: COLUMN_TOP,
          toJSON: () => ({}),
        }) as DOMRect;
      document.body.appendChild(column);
      return column;
    }

    it("résout la colonne + le créneau, neutralise la carte tirée pendant le hit-test puis restaure pointer-events", () => {
      const column = makeColumn("2026-06-05");
      const dragged = document.createElement("button"); // la carte « soulevée »
      document.body.appendChild(dragged);

      // Simule la carte sous le pointeur tant qu'elle intercepte les events :
      // c'est exactement le bug FUNC-001 que le paramètre `ignore` corrige.
      const elementFromPoint = stubElementFromPoint(() =>
        dragged.style.pointerEvents === "none" ? column : dragged,
      );

      const res = resolveDropTarget(50, COLUMN_TOP + 6 * SLOT_HEIGHT_PX + 5, dragged);

      expect(res).not.toBeNull();
      expect(res!.slotIndex).toBe(6); // 11h00
      expect(format(res!.day, "yyyy-MM-dd")).toBe("2026-06-05");
      expect(res!.column).toBe(column);
      // pointer-events restauré après le hit-test synchrone.
      expect(dragged.style.pointerEvents).toBe("");
      expect(elementFromPoint).toHaveBeenCalled();
    });

    it("retourne null si aucune colonne [data-day-key] sous le pointeur", () => {
      const orphan = document.createElement("section");
      stubElementFromPoint(() => orphan);
      expect(resolveDropTarget(50, 200, null)).toBeNull();
    });

    it("retourne null hors de la zone des créneaux (offsetY ≥ 720px)", () => {
      const column = makeColumn("2026-06-05");
      stubElementFromPoint(() => column);
      // Y juste au-delà du bas de la zone → pointToSlot null → annulation.
      expect(
        resolveDropTarget(50, COLUMN_TOP + SLOT_COUNT * SLOT_HEIGHT_PX, null),
      ).toBeNull();
    });
  });
});
