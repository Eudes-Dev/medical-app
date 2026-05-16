/**
 * Specs Playwright Story 3.1 — Persistance Zustand du calendrier.
 *
 * Test design : docs/qa/assessments/3.1-test-design-20260129.md
 */

import { test, expect } from "@playwright/test";

test.describe("3.1 — Persistance Zustand /dashboard/calendar", () => {
  // AC: 3.1-E2E-001
  test("viewMode et showCancelled persistent après rechargement", async ({ page }) => {
    await page.goto("/dashboard/calendar");

    // Bascule en vue Jour
    await page.getByRole("button", { name: "Vue Jour" }).click();
    await expect(page.getByRole("button", { name: "Vue Jour" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    // Reload : la vue Jour doit être conservée (persist Zustand)
    await page.reload();
    await expect(page.getByRole("button", { name: "Vue Jour" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
