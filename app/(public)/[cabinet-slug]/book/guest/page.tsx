/**
 * Étape 2 du tunnel de réservation publique — formulaire patient invité
 * (Story 4.2).
 *
 * Server Component "shell" :
 *  - Métadonnées SEO (title + noindex implicite via Next defaults).
 *  - Rend un Client Component (`GuestPageClient`) qui :
 *      • lit `selectedSlot` depuis `useBookingStore`,
 *      • redirige vers `/[slug]/book` si aucun créneau n'est sélectionné,
 *      • affiche le récap du créneau + le formulaire `<GuestForm>`.
 *
 * @module app/(public)/[cabinet-slug]/book/guest/page
 */

import type { Metadata } from "next";
import { BookingStepper } from "@/components/public/BookingStepper";
import { GuestPageClient } from "./guest-page-client";

export const metadata: Metadata = {
  title: "Réservation – Vos coordonnées",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ "cabinet-slug": string }>;
}

export default async function GuestBookingPage({ params }: PageProps) {
  const { "cabinet-slug": slug } = await params;

  return (
    <div className="flex min-h-screen flex-col bg-[color-mix(in_oklab,#f8fafc_50%,white)]">
      <BookingStepper current={2} />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-6 px-5 py-5 md:px-8 md:py-7">
        <GuestPageClient cabinetSlug={slug} />
      </main>
    </div>
  );
}
