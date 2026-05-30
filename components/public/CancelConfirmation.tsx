"use client";

/**
 * Écran client d'annulation publique (story 5.3, CANCEL-ROUTE-001).
 *
 * Reçoit du Server Component parent le récapitulatif (déjà formaté en heure de
 * Paris) et le `token` opaque. Gère la confirmation via `cancelByToken` :
 * - succès → état « rendez-vous annulé » ;
 * - erreur → message neutre (aucune fuite).
 *
 * UI volontairement sobre (Tailwind, cohérent avec le tunnel public).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Check, Loader2 } from "lucide-react";
import { cancelByToken } from "@/app/(public)/[cabinet-slug]/book/cancel/actions";
import { showError } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface Props {
  token: string;
  /** Récapitulatif déjà formaté en heure de Paris (ex. « lundi 18 mai 2026 à 09:00 »). */
  dateLabel: string;
  appointmentType: string;
  /** Vrai si le RDV est déjà annulé (lien rejoué) — affiche l'état final directement. */
  alreadyCancelled: boolean;
  cabinetSlug: string;
}

export function CancelConfirmation({
  token,
  dateLabel,
  appointmentType,
  alreadyCancelled,
  cabinetSlug,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(alreadyCancelled);

  const onConfirm = () => {
    startTransition(async () => {
      const result = await cancelByToken(token);
      if ("success" in result) {
        setDone(true);
        return;
      }
      // INVALID / RATE_LIMITED / SERVER → message neutre, pas de fuite.
      showError(
        result.error === "RATE_LIMITED"
          ? TOAST_MESSAGES.errors.rateLimited
          : TOAST_MESSAGES.errors.server,
      );
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h1 className="text-lg font-semibold text-slate-900">
          Rendez-vous annulé
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Votre rendez-vous{" "}
          <span className="font-medium text-slate-800">({appointmentType})</span> du{" "}
          {dateLabel} a bien été annulé. Vous pouvez prendre un nouveau
          rendez-vous quand vous le souhaitez.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/${cabinetSlug}/book`)}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Prendre un nouveau rendez-vous
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <CalendarX className="h-6 w-6" />
      </span>
      <h1 className="text-lg font-semibold text-slate-900">
        Annuler votre rendez-vous
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Souhaitez-vous annuler votre rendez-vous{" "}
        <span className="font-medium text-slate-800">({appointmentType})</span> prévu le{" "}
        <span className="font-medium text-slate-900">{dateLabel}</span> ? Cette
        action est définitive.
      </p>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          aria-busy={isPending || undefined}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-600/70"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Annulation…</span>
            </>
          ) : (
            <span>Confirmer l&apos;annulation</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${cabinetSlug}/book`)}
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          Garder mon rendez-vous
        </button>
      </div>
    </div>
  );
}
