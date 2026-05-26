/**
 * Cookie de session signé pour le tunnel de réservation publique (Story 4.2).
 *
 * Le cookie `booking_token` est un JWT HS256 contenant l'`appointmentId`.
 * Il est posé après la création d'un rendez-vous "invité" et lu côté serveur
 * sur la page `/[cabinet-slug]/book/success` pour afficher le récapitulatif
 * sans nécessiter de compte.
 *
 * Sécurité:
 * - `httpOnly` : impossible à lire en JS côté client
 * - `secure`   : transmis uniquement en HTTPS (en production)
 * - `sameSite=lax` : suffisant pour ce flux navigation interne
 * - durée 24h
 *
 * @module lib/booking/session-cookie
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "booking_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

/**
 * Récupère le secret JWT depuis l'environnement. Lance une erreur explicite
 * si la variable est absente ou trop courte (≥ 32 octets requis pour HS256
 * en pratique, sinon vulnérable aux attaques par force brute).
 */
function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "JWT_SECRET is required and must be at least 32 characters long (see .env.example).",
    );
  }
  return new TextEncoder().encode(raw);
}

/**
 * Signe un JWT contenant `appointmentId` et le pose en cookie HTTP-only.
 *
 * @param appointmentId UUID du rendez-vous fraîchement créé
 */
export async function setBookingCookie(appointmentId: string): Promise<void> {
  const token = await new SignJWT({ appointmentId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Lit le cookie `booking_token`, vérifie sa signature et son expiration,
 * et retourne l'`appointmentId` qu'il contient. Retourne `null` si:
 * - le cookie est absent
 * - la signature est invalide
 * - le token est expiré
 * - le payload n'est pas du format attendu
 */
export async function readBookingCookie(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.appointmentId === "string"
      ? payload.appointmentId
      : null;
  } catch {
    return null;
  }
}

/** Supprime le cookie de session (utile pour les tests / déconnexion). */
export async function clearBookingCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Exporté pour les tests uniquement. */
export const __test__ = { COOKIE_NAME, COOKIE_MAX_AGE_SECONDS };
