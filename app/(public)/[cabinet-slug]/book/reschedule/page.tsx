/**
 * Route publique de reprogrammation de rendez-vous (story 8.1).
 *
 * Server Component, strictement aligné sur `book/cancel/page.tsx` :
 *  - Lit le `?token=` (UUID opaque `cancellationToken`, story 6.1) réutilisé
 *    comme **jeton de gestion** du RDV.
 *  - Token absent / inconnu / RDV `CANCELLED` ou `COMPLETED` ⇒ écran d'erreur
 *    **neutre** (pas d'énumération).
 *  - RDV trop proche (délai < {@link RESCHEDULE_MIN_NOTICE_HOURS}h, AC 3) ⇒
 *    écran dédié neutre (« trop proche pour modifier en ligne »).
 *  - Token valide & reprogrammable ⇒ `<RescheduleFlow>` (récap + sélecteur).
 *
 * Défense anti-énumération : GET throttlé (30/min/IP, SEC-003). SEO : `noindex`.
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatSlotParis } from "@/lib/booking/format";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { canStillManage } from "@/lib/booking/reschedule-policy";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import { RescheduleFlow } from "@/components/public/RescheduleFlow";

export const metadata: Metadata = {
  title: "Reprogrammer votre rendez-vous",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ "cabinet-slug": string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function ReschedulePage({ params, searchParams }: PageProps) {
  const { "cabinet-slug": slug } = await params;
  const { token: rawToken } = await searchParams;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  // Défense en profondeur (SEC-003) : la lecture par token n'est pas
  // authentifiée — on throttle aussi le GET de la page (30/min/IP).
  const ip = await getClientIp();
  const allowed = checkRateLimit(`reschedule-page:${ip}`, 30, 60_000).ok;

  // Lecture par token opaque pour afficher le récapitulatif. Aucune information
  // n'est révélée si le token est absent/inconnu (message neutre identique).
  const appointment =
    allowed && token
      ? await prisma.appointment.findUnique({
          where: { cancellationToken: token },
          select: { status: true, startTime: true, type: true },
        })
      : null;

  // Un RDV n'est reprogrammable que s'il est encore actif (ni annulé ni terminé).
  const isManageable =
    !!appointment &&
    appointment.status !== "CANCELLED" &&
    appointment.status !== "COMPLETED";
  // Délai minimum (AC 3) — appliqué aussi côté affichage (source unique avec la
  // Server Action). Le message « trop proche » provient de `TOAST_MESSAGES`.
  const tooLate = isManageable && !canStillManage(appointment!.startTime);

  return (
    <div className="flex min-h-screen flex-col bg-[color-mix(in_oklab,#f8fafc_50%,white)]">
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-5 py-12 md:px-8">
        {!allowed ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Trop de tentatives
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Merci de réessayer dans quelques minutes.
            </p>
          </div>
        ) : !token || !appointment || !isManageable ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Lien de reprogrammation invalide
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ce lien est invalide ou a expiré. Si vous souhaitez modifier votre
              rendez-vous, contactez directement le cabinet.
            </p>
          </div>
        ) : tooLate ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Modification impossible en ligne
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {TOAST_MESSAGES.booking.tooLate}
            </p>
          </div>
        ) : (
          <RescheduleFlow
            token={token}
            currentDateLabel={formatSlotParis(appointment.startTime)}
            appointmentType={appointment.type}
            cabinetSlug={slug}
          />
        )}
      </main>
    </div>
  );
}
