"use client";

/**
 * Calendrier de réservation publique (Client Component).
 *
 * - Rail de dates horizontal (14 jours, cards 78×96) avec snap & scroll.
 * - Créneaux groupés en sections collapsibles Matin / Après-midi.
 * - Footer sticky avec récapitulatif + CTA Continuer.
 * - Sélection persistée dans `useBookingStore` (Zustand).
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, isSameDay, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import { showError } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sun,
  Sunset,
} from "lucide-react";
import { EmptyState as GenericEmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/useBookingStore";
import { getAvailableSlots } from "@/app/(public)/[cabinet-slug]/book/actions";
import {
  getPublicServiceTypes,
  type PublicServiceDTO,
} from "@/app/dashboard/settings/services/actions";
import { ServiceSelector } from "@/components/public/ServiceSelector";

const DAYS_AHEAD = 14;

interface BookingCalendarProps {
  /** Slug du cabinet, utilisé pour naviguer vers l'étape suivante. */
  cabinetSlug: string;
}

export function BookingCalendar({ cabinetSlug }: BookingCalendarProps) {
  const router = useRouter();
  const selectedSlot = useBookingStore((s) => s.selectedSlot);
  const setSelectedSlot = useBookingStore((s) => s.setSelectedSlot);
  const selectedServiceTypeId = useBookingStore((s) => s.selectedServiceTypeId);
  const setSelectedServiceTypeId = useBookingStore(
    (s) => s.setSelectedServiceTypeId,
  );

  /** Services publics (story 7.3). `null` = chargement en cours. */
  const [services, setServices] = useState<PublicServiceDTO[] | null>(null);

  const today = useMemo(() => startOfToday(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<Date[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openMorning, setOpenMorning] = useState(true);
  const [openAfternoon, setOpenAfternoon] = useState(true);

  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today],
  );

  // Chargement des services publics (story 7.3). Liste vide ⇒ pas d'étape motif
  // (repli serveur « Première consultation »).
  useEffect(() => {
    let cancelled = false;
    getPublicServiceTypes()
      .then((list) => {
        if (!cancelled) setServices(list);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Présélection automatique quand un seul service public est proposé.
  useEffect(() => {
    if (services && services.length === 1 && !selectedServiceTypeId) {
      setSelectedServiceTypeId(services[0].id);
    }
  }, [services, selectedServiceTypeId, setSelectedServiceTypeId]);

  const hasServices = (services?.length ?? 0) > 0;
  const selectedService =
    services?.find((s) => s.id === selectedServiceTypeId) ?? null;
  /** Durée affichée dans le récap : durée du service choisi, sinon 30 min. */
  const recapDuration = selectedService
    ? selectedService.durationMin < 60
      ? `${selectedService.durationMin} min`
      : `${Math.floor(selectedService.durationMin / 60)} h${selectedService.durationMin % 60 ? ` ${selectedService.durationMin % 60}` : ""}`
    : "30 min";
  /** On exige un motif uniquement si des services publics existent (AC 3). */
  const canContinue = !!selectedSlot && (!hasServices || !!selectedServiceTypeId);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const result = await getAvailableSlots({ date: selectedDate });
      if (cancelled) return;
      if ("error" in result) {
        // `RATE_LIMITED` (story 5.3) : message neutre dédié ; sinon message serveur.
        const isRateLimited = result.error === "RATE_LIMITED";
        const message = isRateLimited
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

  const handleContinue = () => {
    if (!canContinue) return;
    router.push(`/${cabinetSlug}/book/guest`);
  };

  const morning = slots?.filter((s) => s.getHours() < 13) ?? [];
  const afternoon = slots?.filter((s) => s.getHours() >= 13) ?? [];
  const loading = isPending || slots === null;

  return (
    <>
      <div className="space-y-9 pb-32">
        {/* Motif (story 7.3) — affiché uniquement si des services publics existent */}
        {hasServices && services && (
          <section aria-labelledby="service-picker-title">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2
                id="service-picker-title"
                className="text-[13px] font-semibold tracking-[0.06em] text-slate-700 uppercase"
              >
                Motif
              </h2>
            </div>
            <ServiceSelector
              services={services}
              selectedId={selectedServiceTypeId}
              onSelect={setSelectedServiceTypeId}
            />
          </section>
        )}

        {/* Date rail */}
        <section aria-labelledby="date-picker-title">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <h2
              id="date-picker-title"
              className="text-[13px] font-semibold tracking-[0.06em] text-slate-700 uppercase"
            >
              Date
            </h2>
            <span className="text-xs tabular-nums text-slate-500">
              {format(selectedDate, "MMMM yyyy", { locale: fr }).replace(
                /^./,
                (c) => c.toUpperCase(),
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

        {/* Slots */}
        <section aria-labelledby="slots-title">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <h2 id="slots-title" className="text-[13px] font-semibold tracking-[0.06em] text-slate-700 uppercase">
              Horaires{" "}
              <span className="ml-1 font-medium tracking-normal text-slate-400 normal-case">
                — {format(selectedDate, "EEEE d MMMM", { locale: fr })}
              </span>
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">
              <Pulse />
              Temps réel
            </span>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </p>
          ) : loading ? (
            <div className="flex flex-col gap-2">
              <SkeletonSection icon={<Sun className="h-4 w-4" />} label="Matin" n={6} />
              <SkeletonSection icon={<Sunset className="h-4 w-4" />} label="Après-midi" n={4} />
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
                  <SlotGrid slots={morning} selected={selectedSlot} onSelect={setSelectedSlot} />
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
                  <SlotGrid slots={afternoon} selected={selectedSlot} onSelect={setSelectedSlot} />
                </SlotSection>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Floating footer (pill-shaped, centered) */}
      <div
        role="region"
        aria-label="Récapitulatif et validation"
        className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 rounded-full border border-slate-200/80 bg-white/90 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.25),0_8px_20px_-10px_rgba(15,23,42,0.15)] backdrop-blur-xl md:bottom-6"
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center gap-3 py-2.5 pr-2.5 pl-4 md:py-3 md:pr-3 md:pl-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {selectedSlot ? (
              <>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold tracking-[-0.005em] text-slate-900 capitalize">
                    {format(selectedSlot, "EEEE d MMMM", { locale: fr })}
                  </span>
                  <span className="mt-[3px] truncate text-[12.5px] tabular-nums text-slate-500">
                    à <strong className="font-semibold text-slate-900">{format(selectedSlot, "HH:mm")}</strong> · {recapDuration}
                    {hasServices && !selectedServiceTypeId && (
                      <span className="ml-1 font-medium normal-case text-amber-600">
                        — choisissez un motif
                      </span>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-400">
                  <Clock className="h-4 w-4" />
                </span>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-slate-500">
                    Aucun créneau sélectionné
                  </span>
                  <span className="mt-[3px] truncate text-[12.5px] text-slate-500">
                    Choisissez un horaire ci-dessus pour continuer.
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className={cn(
              "group inline-flex h-12 shrink-0 items-center gap-2 rounded-full pr-[18px] pl-[22px] text-[15px] font-semibold tracking-[-0.005em] transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              canContinue
                ? "bg-blue-600 text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,0.45),0_2px_6px_-2px_rgba(37,99,235,0.3)] hover:-translate-y-px hover:bg-blue-700 active:translate-y-0"
                : "cursor-not-allowed bg-slate-200 text-slate-400",
            )}
            aria-label={
              canContinue
                ? `Continuer avec le créneau du ${format(selectedSlot!, "EEEE d MMMM 'à' HH:mm", { locale: fr })}`
                : hasServices && selectedSlot && !selectedServiceTypeId
                  ? "Sélectionnez un motif pour continuer"
                  : "Sélectionnez un créneau pour continuer"
            }
          >
            <span>Continuer</span>
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full transition-transform",
                selectedSlot ? "bg-white/20 group-hover:translate-x-0.5" : "bg-slate-100",
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */

function DateRail({
  days,
  today,
  selected,
  onSelect,
}: {
  days: Date[];
  today: Date;
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = railRef.current;
    if (!r) return;
    const el = r.querySelector<HTMLElement>('[aria-checked="true"]');
    if (el) {
      r.scrollLeft = el.offsetLeft - r.clientWidth / 2 + el.offsetWidth / 2;
    }
  }, []);

  const scrollBy = (delta: number) => {
    railRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onSelect(days[Math.min(i + 1, days.length - 1)]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onSelect(days[Math.max(i - 1, 0)]);
    }
  };

  return (
    <div className="relative -mx-5 md:-mx-2">
      <button
        type="button"
        aria-label="Jours précédents"
        onClick={() => scrollBy(-260)}
        className="absolute top-1/2 -left-3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.04)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 md:inline-flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={railRef}
        role="radiogroup"
        aria-label="Choisir une date"
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {days.map((d, i) => {
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="radio"
              aria-checked={isSel}
              tabIndex={isSel ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => onSelect(d)}
              className={cn(
                "relative flex h-[96px] w-[78px] shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] px-1 py-2.5 transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                isSel
                  ? "scale-[1.03] border-blue-600 bg-blue-600 text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,0.45),0_2px_6px_-2px_rgba(37,99,235,0.3)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold tracking-[0.08em] uppercase",
                  isSel ? "text-white" : "text-slate-500",
                )}
              >
                {format(d, "EEE", { locale: fr })}
              </span>
              <span
                className={cn(
                  "text-[26px] leading-none font-semibold tracking-[-0.025em] tabular-nums",
                  isSel ? "text-white" : "text-slate-900",
                )}
              >
                {format(d, "d")}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium lowercase",
                  isSel ? "text-white/75" : "text-slate-400",
                )}
              >
                {format(d, "MMM", { locale: fr })}
              </span>
              {isToday && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-[7px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full",
                    isSel ? "bg-white" : "bg-blue-600",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Jours suivants"
        onClick={() => scrollBy(260)}
        className="absolute top-1/2 -right-3 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.04)] transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 md:inline-flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SlotSection({
  icon,
  label,
  count,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
          open && "border-b border-slate-100",
        )}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-[-0.005em] text-slate-900">{label}</span>
        <span className="ml-0.5 text-[12.5px] tabular-nums text-slate-500">
          {count} {count > 1 ? "créneaux" : "créneau"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-slate-400 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div
          role="radiogroup"
          aria-label={label}
          className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:gap-2.5"
        >
          {children}
        </div>
      )}
    </section>
  );
}

function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: Date[];
  selected: Date | null;
  onSelect: (s: Date) => void;
}) {
  return (
    <>
      {slots.map((s) => {
        const isSel = selected !== null && s.getTime() === selected.getTime();
        return (
          <button
            key={s.toISOString()}
            type="button"
            role="radio"
            aria-checked={isSel}
            onClick={() => onSelect(s)}
            className={cn(
              "h-12 min-w-[88px] rounded-xl border-[1.5px] text-sm font-semibold tracking-[-0.005em] tabular-nums transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:scale-[0.97]",
              isSel
                ? "border-blue-600 bg-blue-600 text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,0.45),0_2px_6px_-2px_rgba(37,99,235,0.3)]"
                : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
            )}
          >
            {format(s, "HH:mm")}
          </button>
        );
      })}
    </>
  );
}

function SkeletonSection({
  icon,
  label,
  n,
}: {
  icon: React.ReactNode;
  label: string;
  n: number;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <span className="ml-0.5 text-[12.5px] text-slate-500">— créneaux</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:gap-2.5">
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]"
          />
        ))}
      </div>
    </section>
  );
}

function Pulse() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}
