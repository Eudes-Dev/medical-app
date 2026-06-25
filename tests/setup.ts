// Fuseau fixé à UTC pour des tests déterministes quel que soit le runner
// (CI vs local). Le matching de la liste d'attente (story 8.5) compare le jour
// calendaire **local** du créneau aux bornes `@db.Date` lues en UTC : sans TZ
// fixe, le test de fenêtre dépendrait du fuseau de la machine (cf. REL-853).
// Doit être posé avant toute lecture de `Date`.
process.env.TZ = "UTC";

import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// Polyfill localStorage / sessionStorage : avec vitest 4 + jsdom 27, l'env
// `jsdom` expose un objet vide à la place du Storage de jsdom (removeItem
// notamment est undefined). On remplace par une implémentation in-memory
// conforme à l'API Storage, suffisante pour les tests du middleware persist
// de Zustand et autres dépendants de localStorage.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

if (typeof globalThis.localStorage?.removeItem !== "function") {
  Object.defineProperty(globalThis, "localStorage", {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });
}
if (typeof globalThis.sessionStorage?.removeItem !== "function") {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: createMemoryStorage(),
    writable: true,
    configurable: true,
  });
}

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/patients",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));
