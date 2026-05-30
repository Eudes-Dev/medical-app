/**
 * Route publique d'annulation de rendez-vous (story 5.3, CANCEL-ROUTE-001).
 *
 * Server Component :
 *  - Lit le `?token=` (UUID opaque `cancellationToken`, story 6.1).
 *  - Token absent / inconnu ⇒ écran d'erreur **neutre** (pas d'énumération).
 *  - Token valide ⇒ écran de confirmation (`<CancelConfirmation>`), avec le
 *    récapitulatif formaté en heure de **Paris**.
 *
 * L'annulation effective est réalisée par la Server Action `cancelByToken`
 * (idempotente, rate-limitée). SEO : `noindex`.
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatSlotParis } from "@/lib/booking/format";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { CancelConfirmation } from "@/components/public/CancelConfirmation";

export const metadata: Metadata = {
  title: "Annuler votre rendez-vous",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ "cabinet-slug": string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function CancelPage({ params, searchParams }: PageProps) {
  const { "cabinet-slug": slug } = await params;
  const { token: rawToken } = await searchParams;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  // Défense en profondeur (SEC-003) : la lecture par token n'est pas
  // authentifiée — on throttle aussi le GET de la page (30/min/IP) pour limiter
  // toute énumération, en complément du rate-limit de la Server Action.
  const ip = await getClientIp();
  const allowed = checkRateLimit(`cancel-page:${ip}`, 30, 60_000).ok;

  // Lecture par token opaque pour afficher le récapitulatif. Aucune information
  // n'est révélée si le token est absent/inconnu (message neutre identique).
  const appointment =
    allowed && token
      ? await prisma.appointment.findUnique({
          where: { cancellationToken: token },
          select: { status: true, startTime: true, type: true },
        })
      : null;

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
        ) : !token || !appointment ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Lien d&apos;annulation invalide
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ce lien d&apos;annulation est invalide ou a expiré. Si vous
              souhaitez modifier votre rendez-vous, contactez directement le
              cabinet.
            </p>
          </div>
        ) : (
          <CancelConfirmation
            token={token}
            dateLabel={formatSlotParis(appointment.startTime)}
            appointmentType={appointment.type}
            alreadyCancelled={appointment.status === "CANCELLED"}
            cabinetSlug={slug}
          />
        )}
      </main>
    </div>
  );
}
