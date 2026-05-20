/**
 * Page de réservation publique — étape 1: sélection du créneau.
 *
 * Server Component "shell" qui rend l'enveloppe SEO + le client component
 * `BookingCalendar` pour l'interaction.
 *
 * @module app/(public)/[cabinet-slug]/book/page
 */

import type { Metadata } from "next";
import { BookingCalendar } from "@/components/public/BookingCalendar";
import { BookingStepper } from "@/components/public/BookingStepper";
import { CABINET_INFO } from "@/lib/cabinet/config";

export const metadata: Metadata = {
  title: `Prendre rendez-vous — ${CABINET_INFO.name}`,
  description: `Choisissez votre créneau de rendez-vous au ${CABINET_INFO.name}. Réservation en ligne, sans création de compte.`,
  openGraph: {
    title: `Prendre rendez-vous — ${CABINET_INFO.name}`,
    description: "Choisissez la date et l'heure de votre rendez-vous.",
    type: "website",
  },
};

interface PageProps {
  params: Promise<{ "cabinet-slug": string }>;
}

export default async function BookPage({ params }: PageProps) {
  const { "cabinet-slug": slug } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-[color-mix(in_oklab,#f8fafc_50%,white)]">
      <BookingStepper current={1} />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pt-6 pb-36 md:px-8 md:pt-9">
        <header className="mb-7 md:mb-9">
          <h1 className="m-0 text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] text-slate-900 md:text-[36px]">
            Choisissez votre rendez-vous
          </h1>
          <p className="mt-2 text-[15px] text-slate-500 text-pretty">
            Sélectionnez une date puis un horaire disponible.
          </p>
        </header>
        <BookingCalendar cabinetSlug={slug} />
      </main>
    </div>
  );
}
