"use client";

/**
 * Écran client de reprogrammation publique (story 8.1).
 *
 * Reçoit du Server Component parent le récapitulatif du RDV **actuel** (déjà
 * formaté en heure de Paris) et le `token` opaque. Affiche un sélecteur de
 * nouveau créneau (rail de dates + créneaux) alimenté par `getAvailableSlots`
 * (action existante, TZ-correcte et rate-limitée), puis confirme via
 * `rescheduleByToken`.
 *
 * Réutilise les sous-composants présentationnels `components/public/slot-picker`
 * (DRY — partagés avec `BookingCalendar`). État **local** (pas de store) : la
 * reprogrammation est un flux autonome, indépendant du tunnel de réservation.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, isSameDay, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CalendarX,
  Loader2,
  Sun,
  Sunset,
} from "lucide-react";
import { EmptyState as GenericEmptyState } from "@/components/ui/empty-state";
import {
  DateRail,
  SlotSection,
  SlotGrid,
  SkeletonSection,
} from "@/components/public/slot-picker";
import { getAvailableSlots } from "@/app/(public)/[cabinet-slug]/book/actions";
import { rescheduleByToken } from "@/app/(public)/[cabinet-slug]/book/reschedule/actions";
import { formatSlotParis } from "@/lib/booking/format";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

const DAYS_AHEAD = 14;

interface Props {
  token: string;
  /** Récap du RDV actuel, déjà formaté en heure de Paris. */
  currentDateLabel: string;
  appointmentType: string;
  cabinetSlug: string;
}

export function RescheduleFlow({
  token,
  currentDateLabel,
  appointmentType,
  cabinetSlug,
}: Props) {
  const router = useRouter();
  const today = useMemo(() => startOfToday(), []);
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<Date[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openMorning, setOpenMorning] = useState(true);
  const [openAfternoon, setOpenAfternoon] = useState(true);
  const [isLoading, startLoading] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [doneLabel, setDoneLabel] = useState<string | null>(null);

  // Charge les créneaux disponibles de la date sélectionnée (action existante).
  useEffect(() => {
    let cancelled = false;
    startLoading(async () => {
      const result = await getAvailableSlots({ date: selectedDate });
      if (cancelled) return;
      if ("error" in result) {
        const message =
          result.error === "RATE_LIMITED"
            ? TOAST_MESSAGES.errors.rateLimited
            : TOAST_MESSAGES.errors.server;
        setError(message);
        setSlots([]);
        showError(message);
        return;
      }
      setError(null);
      setSlots(result.slots.map((iso) => new Date(iso)));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleSelectDate = (day: Date) => {
    setSelectedDate(day);
    setSlots(null);
    setError(null);
    if (selectedSlot && !isSameDay(selectedSlot, day)) {
      setSelectedSlot(null);
    }
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;
    const slot = selectedSlot;
    startSubmit(async () => {
      const result = await rescheduleByToken(token, slot.toISOString());
      if ("success" in result) {
        setDoneLabel(formatSlotParis(slot));
        showSuccess(TOAST_MESSAGES.booking.rescheduled);
        return;
      }
      // Mapping neutre des codes d'erreur (aucune fuite).
      const message =
        result.error === "TOO_LATE"
          ? TOAST_MESSAGES.booking.tooLate
          : result.error === "SLOT_TAKEN"
            ? TOAST_MESSAGES.errors.slotTaken
            : result.error === "RATE_LIMITED"
              ? TOAST_MESSAGES.errors.rateLimited
              : TOAST_MESSAGES.errors.server;
      showError(message);
      // Le créneau visé vient peut-être d'être pris : on rafraîchit la liste.
      if (result.error === "SLOT_TAKEN") {
        setSelectedSlot(null);
        setSlots(null);
        startLoading(async () => {
          const refreshed = await getAvailableSlots({ date: selectedDate });
          if ("error" in refreshed) {
            setSlots([]);
            return;
          }
          setSlots(refreshed.slots.map((iso) => new Date(iso)));
        });
      }
    });
  };

  const morning = slots?.filter((s) => s.getHours() < 13) ?? [];
  const afternoon = slots?.filter((s) => s.getHours() >= 13) ?? [];
  const loading = isLoading || slots === null;

  // État final : reprogrammation confirmée.
  if (doneLabel) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h1 className="text-lg font-semibold text-slate-900">
          Rendez-vous reprogrammé
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Votre rendez-vous{" "}
          <span className="font-medium text-slate-800">({appointmentType})</span>{" "}
          est désormais prévu le{" "}
          <span className="font-medium text-slate-900">{doneLabel}</span>. Un email
          de confirmation vous a été envoyé si une adresse est associée à votre
          dossier.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${cabinetSlug}/book`)}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Retour au cabinet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Récap du RDV actuel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <CalendarClock className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-semibold text-slate-900">
          Reprogrammer votre rendez-vous
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Rendez-vous actuel{" "}
          <span className="font-medium text-slate-800">({appointmentType})</span> :{" "}
          <span className="font-medium text-slate-900">{currentDateLabel}</span>.
          Choisissez ci-dessous un nouveau créneau.
        </p>
      </div>

      {/* Rail de dates */}
      <section aria-labelledby="reschedule-date-title">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <h2
            id="reschedule-date-title"
            className="text-[13px] font-semibold tracking-[0.06em] text-slate-700 uppercase"
          >
            Nouvelle date
          </h2>
          <span className="text-xs tabular-nums text-slate-500">
            {format(selectedDate, "MMMM yyyy", { locale: fr }).replace(/^./, (c) =>
              c.toUpperCase(),
            )}
          </span>
        </div>
        <DateRail
          days={days}
          today={today}
          selected={selectedDate}
          onSelect={handleSelectDate}
        />
      </section>

      {/* Créneaux */}
      <section aria-labelledby="reschedule-slots-title">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <h2
            id="reschedule-slots-title"
            className="text-[13px] font-semibold tracking-[0.06em] text-slate-700 uppercase"
          >
            Horaires{" "}
            <span className="ml-1 font-medium tracking-normal text-slate-400 normal-case">
              — {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </span>
          </h2>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        ) : loading ? (
          <div className="flex flex-col gap-2">
            <SkeletonSection icon={<Sun className="h-4 w-4" />} label="Matin" n={6} />
            <SkeletonSection
              icon={<Sunset className="h-4 w-4" />}
              label="Après-midi"
              n={4}
            />
          </div>
        ) : slots && slots.length === 0 ? (
          <GenericEmptyState
            icon={CalendarX}
            title="Aucun créneau disponible ce jour"
            description="Essayez une autre date pour trouver un créneau."
            action={
              <button
                type="button"
                onClick={() => handleSelectDate(addDays(selectedDate, 1))}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Jour suivant
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2" aria-live="polite">
            {morning.length > 0 && (
              <SlotSection
                icon={<Sun className="h-4 w-4" />}
                label="Matin"
                count={morning.length}
                open={openMorning}
                onToggle={() => setOpenMorning((v) => !v)}
              >
                <SlotGrid
                  slots={morning}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              </SlotSection>
            )}
            {afternoon.length > 0 && (
              <SlotSection
                icon={<Sunset className="h-4 w-4" />}
                label="Après-midi"
                count={afternoon.length}
                open={openAfternoon}
                onToggle={() => setOpenAfternoon((v) => !v)}
              >
                <SlotGrid
                  slots={afternoon}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />
              </SlotSection>
            )}
          </div>
        )}
      </section>

      {/* Confirmation */}
      <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedSlot || isSubmitting}
          aria-busy={isSubmitting || undefined}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Reprogrammation…</span>
            </>
          ) : (
            <span>
              {selectedSlot
                ? `Confirmer le ${format(selectedSlot, "EEEE d MMMM 'à' HH:mm", { locale: fr })}`
                : "Confirmer le nouveau créneau"}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${cabinetSlug}/book`)}
          disabled={isSubmitting}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
