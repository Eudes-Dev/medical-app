/**
 * Tests unitaires pour le hook useDebounce
 * 
 * Test ID: 2.1-UNIT-002
 * Priority: P1
 * Level: Unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDebounce } from "@/hooks/use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("2.1-UNIT-002: devrait retarder la mise à jour de la valeur de 300ms par défaut", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      {
        initialProps: { value: "initial" },
      }
    );

    // La valeur initiale devrait être immédiatement disponible
    expect(result.current).toBe("initial");

    // Changer la valeur
    rerender({ value: "updated" });

    // La valeur ne devrait pas encore être mise à jour
    expect(result.current).toBe("initial");

    // Avancer le temps de 299ms
    vi.advanceTimersByTime(299);
    expect(result.current).toBe("initial");

    // Avancer le temps de 1ms de plus (total 300ms)
    vi.advanceTimersByTime(1);
    await waitFor(() => {
      expect(result.current).toBe("updated");
    });
  });

  it("devrait utiliser le délai personnalisé fourni", async () => {
    const customDelay = 500;
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, customDelay),
      {
        initialProps: { value: "initial" },
      }
    );

    act(() => {
      rerender({ value: "updated" });
    });

    // Avancer de 499ms - ne devrait pas être mis à jour
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("initial");

    // Avancer de 1ms de plus (total 500ms)
    act(() => {
      vi.advanceTimersByTime(1);
    });
    await waitFor(() => {
      expect(result.current).toBe("updated");
    });
  });

  it("devrait annuler le timer précédent si la valeur change rapidement", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: "initial" },
      }
    );

    // Changer rapidement plusieurs fois
    act(() => {
      rerender({ value: "value1" });
      vi.advanceTimersByTime(100);
    });

    act(() => {
      rerender({ value: "value2" });
      vi.advanceTimersByTime(100);
    });

    act(() => {
      rerender({ value: "value3" });
      vi.advanceTimersByTime(100);
    });

    // La valeur devrait toujours être "initial" car aucun délai complet n'a été atteint
    expect(result.current).toBe("initial");

    // Après 300ms depuis le dernier changement, devrait être "value3"
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(result.current).toBe("value3");
    });
  });

  it("devrait fonctionner avec différents types de valeurs", async () => {
    // Test avec un nombre
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 0 },
      }
    );

    act(() => {
      rerenderNumber({ value: 42 });
      vi.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(numberResult.current).toBe(42);
    });

    // Test avec un objet
    const { result: objectResult, rerender: rerenderObject } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: { name: "initial" } },
      }
    );

    act(() => {
      rerenderObject({ value: { name: "updated" } });
      vi.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(objectResult.current).toEqual({ name: "updated" });
    });
  });
});
