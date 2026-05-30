/**
 * Schéma Zod des exceptions d'agenda `TimeOff` (story 7.2).
 *
 * Utilisé côté serveur (`createTimeOff`, `previewTimeOffImpact` — défense en
 * profondeur) ET côté client (`timeoff-form` — feedback inline), conforme à la
 * convention projet de double validation.
 *
 * @module lib/validations/time-off
 */

import { z } from "zod";
import { toMinutes } from "@/lib/cabinet/working-hours";
import { dayKey } from "@/lib/cabinet/time-off";

/** Heure "HH:mm" 24h (00:00 → 23:59). */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Longueur maximale du motif (AC 5). */
export const TIME_OFF_REASON_MAX_LENGTH = 200;

/**
 * Une exception d'agenda :
 * - `allDay=true` : `startDate → endDate` inclusives (`endDate ≥ startDate`).
 *   `startTime` / `endTime` ignorés.
 * - `allDay=false` : jour unique (`startDate == endDate`), `startTime` /
 *   `endTime` requis au format "HH:mm" avec `endTime > startTime`.
 */
export const timeOffSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    allDay: z.boolean(),
    startTime: z
      .string()
      .regex(HHMM, "Heure de début invalide (HH:mm)")
      .optional(),
    endTime: z
      .string()
      .regex(HHMM, "Heure de fin invalide (HH:mm)")
      .optional(),
    reason: z
      .string()
      .max(TIME_OFF_REASON_MAX_LENGTH, `Motif limité à ${TIME_OFF_REASON_MAX_LENGTH} caractères.`)
      .optional(),
  })
  .refine((v) => dayKey(v.endDate) >= dayKey(v.startDate), {
    message: "La date de fin doit être ≥ à la date de début.",
    path: ["endDate"],
  })
  .refine((v) => v.allDay || dayKey(v.startDate) === dayKey(v.endDate), {
    message: "Une plage horaire doit porter sur un seul jour.",
    path: ["endDate"],
  })
  .refine((v) => v.allDay || (!!v.startTime && !!v.endTime), {
    message: "Heures de début et de fin requises.",
    path: ["startTime"],
  })
  .refine(
    (v) =>
      v.allDay ||
      (v.startTime != null &&
        v.endTime != null &&
        toMinutes(v.endTime) > toMinutes(v.startTime)),
    {
      message: "L'heure de fin doit être après l'heure de début.",
      path: ["endTime"],
    },
  );

export type TimeOffValues = z.infer<typeof timeOffSchema>;
export type TimeOffInput = z.input<typeof timeOffSchema>;
