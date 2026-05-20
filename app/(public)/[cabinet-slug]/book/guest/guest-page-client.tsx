"use client";

/**
 * Client Component associé à `/[cabinet-slug]/book/guest`.
 *
 * - Lit `selectedSlot` dans `useBookingStore`.
 * - Si `null` (utilisateur arrivant directement sur l'URL), redirige vers
 *   l'étape 1 (`/[slug]/book`).
 * - Affiche le récap sticky (formatté `Europe/Paris`) + `<GuestForm>`.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Pencil } from "lucide-react";
import { useBookingStore } from "@/stores/useBookingStore";
import { GuestForm } from "@/components/public/GuestForm";

interface Props {
  cabinetSlug: string;
}

export function GuestPageClient({ cabinetSlug }: Props) {
  const router = useRouter();
  const selectedSlot = useBookingStore((s) => s.selectedSlot);

  useEffect(() => {
    if (!selectedSlot) {
      router.replace(`/${cabinetSlug}/book`);
    }
  }, [selectedSlot, cabinetSlug, router]);

  if (!selectedSlot) {
    return (
      <p className="text-center text-sm text-slate-600">
        Redirection vers la sélection du créneau…
      </p>
    );
  }

  const slotISO = selectedSlot.toISOString();
  const longDate = format(selectedSlot, "EEEE d MMMM yyyy", { locale: fr });
  const time = format(selectedSlot, "HH:mm");

  return (
    <>
      <div
        role="region"
        aria-label="Créneau sélectionné"
        className="sticky top-3 z-[5] flex items-center justify-between gap-3 rounded-3xl border border-blue-200/70 bg-[color-mix(in_oklab,#eff6ff_75%,white)] py-3.5 pr-3.5 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_-12px_rgba(37,99,235,0.25)] backdrop-saturate-150 md:py-[18px] md:pr-[18px] md:pl-5"
        data-testid="slot-summary"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-[0_1px_2px_rgba(37,99,235,.08),0_0_0_1px_rgba(37,99,235,.08)]"
          >
            <CalendarIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-blue-700/90 uppercase">
              Votre rendez-vous
            </span>
            <span className="inline-flex flex-wrap items-baseline gap-2 text-[16px] font-semibold tracking-[-0.01em] text-slate-900">
              <span className="capitalize">{longDate}</span>
              <span aria-hidden="true" className="font-medium text-slate-300">
                ·
              </span>
              <span className="tabular-nums">{time}</span>
            </span>
            <span className="mt-1 text-[12.5px] text-slate-500">
              durée <strong className="font-semibold text-slate-700">30 min</strong>
            </span>
          </div>
        </div>
        <Link
          href={`/${cabinetSlug}/book`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-blue-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Pencil className="h-3 w-3" />
          <span>Modifier</span>
        </Link>
      </div>

      <header className="mt-6 mb-1">
        <h1 className="m-0 text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] text-slate-900 md:text-[32px]">
          Vos coordonnées
        </h1>
        <p className="mt-2 text-[15px] text-slate-500 text-pretty">
          Pour confirmer votre rendez-vous. Aucun compte requis.
        </p>
      </header>

      <GuestForm slotISO={slotISO} cabinetSlug={cabinetSlug} />
    </>
  );
}
