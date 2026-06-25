/**
 * Helpers purs de la liste d'attente (story 8.5).
 *
 * Fonctions déterministes, **sans accès base ni DOM** : le tri de la file
 * (priorité décroissante puis FIFO) est testable en isolation. Prisma ne sait
 * pas trier un enum par sévérité ; on applique donc ce comparateur en mémoire
 * côté action (cf. `getWaitlist`/`getMatchingWaitlistEntries`).
 *
 * @module lib/waitlist/waitlist-utils
 */

import type { WaitlistPriority } from "@/types";

/**
 * Poids de tri des niveaux d'urgence (plus haut = traité en premier).
 * `URGENT` > `HIGH` > `NORMAL`.
 */
export const WAITLIST_PRIORITY_WEIGHT: Record<WaitlistPriority, number> = {
  URGENT: 3,
  HIGH: 2,
  NORMAL: 1,
};

/** Forme minimale requise pour le tri de la file. */
export interface WaitlistSortable {
  priority: WaitlistPriority;
  createdAt: Date;
}

/**
 * Comparateur de tri de la file : priorité **décroissante** (URGENT d'abord)
 * puis ancienneté **croissante** (FIFO à priorité égale).
 *
 * À passer à `Array.prototype.sort`. Pur et stable vis-à-vis des deux critères.
 */
export function compareWaitlistEntries(
  a: WaitlistSortable,
  b: WaitlistSortable,
): number {
  const weightDiff =
    WAITLIST_PRIORITY_WEIGHT[b.priority] - WAITLIST_PRIORITY_WEIGHT[a.priority];
  if (weightDiff !== 0) return weightDiff;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Trie une copie de la liste selon `compareWaitlistEntries` (n'altère pas l'entrée).
 */
export function sortWaitlistEntries<T extends WaitlistSortable>(entries: T[]): T[] {
  return [...entries].sort(compareWaitlistEntries);
}
