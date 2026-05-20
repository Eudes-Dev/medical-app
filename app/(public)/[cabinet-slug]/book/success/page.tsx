/**
 * Étape 3 du tunnel de réservation publique — écran de succès (Story 4.3).
 *
 * Server Component :
 *  - Lit le cookie HTTP-only `booking_token` via `readBookingCookie`.
 *  - Si aucun token valide ⇒ redirect `/[slug]/book`.
 *  - Charge l'`Appointment` puis hydrate `<BookingConfirmation>` (Client)
 *    qui gère interactions (copie référence, toggles rappels, modale d'annulation).
 *
 * SEO: `noindex`.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CABINET_INFO } from "@/lib/cabinet/config";
import { readBookingCookie } from "@/lib/booking/session-cookie";
import { BookingStepper } from "@/components/public/BookingStepper";
import { BookingConfirmation } from "@/components/public/BookingConfirmation";

export const metadata: Metadata = {
  title: "Réservation confirmée",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ "cabinet-slug": string }>;
}

export default async function BookingSuccessPage({ params }: PageProps) {
  const { "cabinet-slug": slug } = await params;
  const appointmentId = await readBookingCookie();

  if (!appointmentId) {
    redirect(`/${slug}/book`);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      patient: { select: { email: true, phone: true } },
    },
  });

  if (!appointment) {
    redirect(`/${slug}/book`);
  }

  const durationMin = Math.max(
    5,
    Math.round(
      (appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000,
    ),
  );

  return (
    <div className="flex min-h-screen flex-col bg-[color-mix(in_oklab,#f8fafc_50%,white)]">
      <BookingStepper current={3} />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4 px-5 pt-6 pb-14 md:gap-[18px] md:px-8 md:pt-9 md:pb-16">
        <BookingConfirmation
          cabinetSlug={slug}
          appointment={{
            id: appointment.id,
            startTime: appointment.startTime.toISOString(),
            durationMin,
            email: appointment.patient?.email ?? null,
            phone: appointment.patient?.phone ?? "",
            doctorName: "Médecin du cabinet",
            doctorSpeciality: "Médecine générale",
            cabinetName: CABINET_INFO.name,
            cabinetAddress: CABINET_INFO.address,
          }}
        />
      </main>
    </div>
  );
}
