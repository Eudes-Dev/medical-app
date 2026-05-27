/**
 * Schémas de validation Zod des horaires d'ouverture (story 7.1).
 *
 * Utilisés côté serveur (`saveWorkingHours` — défense en profondeur) ET côté
 * client (feedback inline dans `schedule-editor`) pour la double validation,
 * conforme à la convention projet.
 *
 * @module lib/validations/working-hours
 */

import { z } from "zod";
import { rangesOverlap, toMinutes } from "@/lib/cabinet/working-hours";

/** Heure "HH:mm" 24h (00:00 → 23:59). */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Durées de créneau autorisées (minutes). */
export const SLOT_DURATIONS = [15, 30, 45, 60] as const;

/**
 * Une plage horaire : heures valides, durée dans l'enum, fin > début, et
 * amplitude suffisante pour contenir au moins un créneau.
 */
export const timeRangeSchema = z
  .object({
    startTime: z.string().regex(HHMM, "Heure de début invalide (HH:mm)"),
    endTime: z.string().regex(HHMM, "Heure de fin invalide (HH:mm)"),
    slotDuration: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(45),
      z.literal(60),
    ]),
    active: z.boolean(),
  })
  .refine((r) => toMinutes(r.endTime) > toMinutes(r.startTime), {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  })
  .refine((r) => toMinutes(r.endTime) - toMinutes(r.startTime) >= r.slotDuration, {
    message: "La plage est trop courte pour contenir un créneau.",
    path: ["endTime"],
  });

/**
 * Le planning d'un jour : son `dayOfWeek` (0=Dimanche … 6=Samedi) et ses
 * plages, dont aucune ne doit se chevaucher.
 */
export const dayScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    ranges: z.array(timeRangeSchema),
  })
  .refine(
    (d) =>
      d.ranges.every((a, i) =>
        d.ranges.every((b, j) => i >= j || !rangesOverlap(a, b)),
      ),
    {
      message: "Les plages d'un même jour ne doivent pas se chevaucher.",
      path: ["ranges"],
    },
  );

/** Le planning complet de la semaine (7 jours). */
export const weekScheduleSchema = z.array(dayScheduleSchema);

export type TimeRangeValues = z.infer<typeof timeRangeSchema>;
export type DayScheduleValues = z.infer<typeof dayScheduleSchema>;
export type WeekScheduleValues = z.infer<typeof weekScheduleSchema>;
