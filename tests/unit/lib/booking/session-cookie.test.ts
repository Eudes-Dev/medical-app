// @vitest-environment node
/**
 * Tests unitaires de `lib/booking/session-cookie` (Story 4.2).
 *
 * Lancé en environnement Node (et non jsdom) car la lib `jose` utilise
 * `crypto.subtle` et un check `payload instanceof Uint8Array` qui échoue
 * sous jsdom à cause de deux globals `Uint8Array` distincts.
 *
 * Couvre :
 * - Round-trip sign / verify : on récupère l'`appointmentId` posé.
 * - Token absent ⇒ `null`.
 * - Token avec signature invalide ⇒ `null` (catch silencieux).
 * - JWT_SECRET manquant ⇒ `Error` clair.
 *
 * On stubbe `next/headers.cookies` avec un store in-memory, conformément
 * au pattern utilisé ailleurs dans la base de tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const memoryStore = new Map<string, { value: string }>();
const cookiesMock = {
  get: (name: string) => memoryStore.get(name),
  set: (name: string, value: string) => {
    memoryStore.set(name, { value });
  },
  delete: (name: string) => {
    memoryStore.delete(name);
  },
};

vi.mock("next/headers", () => ({
  cookies: async () => cookiesMock,
}));

// Doit être défini AVANT l'import du module testé (le module lit
// `process.env.JWT_SECRET` paresseusement, donc on peut le faire ici).
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters-aaaa";

import {
  setBookingCookie,
  readBookingCookie,
  clearBookingCookie,
} from "@/lib/booking/session-cookie";

describe("session-cookie (Story 4.2)", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it("round-trip : setBookingCookie puis readBookingCookie renvoie l'appointmentId", async () => {
    await setBookingCookie("apt-uuid-1");
    const id = await readBookingCookie();
    expect(id).toBe("apt-uuid-1");
  });

  it("readBookingCookie renvoie null si aucun cookie n'est posé", async () => {
    const id = await readBookingCookie();
    expect(id).toBeNull();
  });

  it("readBookingCookie renvoie null si la signature est invalide (tampering)", async () => {
    await setBookingCookie("apt-uuid-2");
    const cookie = memoryStore.get("booking_token")!;
    // On corrompt la signature (dernier segment du JWT).
    const parts = cookie.value.split(".");
    parts[2] = "X".repeat(parts[2].length);
    cookiesMock.set("booking_token", parts.join("."));
    const id = await readBookingCookie();
    expect(id).toBeNull();
  });

  it("clearBookingCookie efface le cookie", async () => {
    await setBookingCookie("apt-uuid-3");
    await clearBookingCookie();
    expect(await readBookingCookie()).toBeNull();
  });

  it("lève une erreur explicite si JWT_SECRET est trop court", async () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "short";
    await expect(setBookingCookie("apt-x")).rejects.toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = original;
  });
});
