/**
 * Landing page publique du cabinet.
 *
 * Route : `/[cabinet-slug]` — pour le MVP single-tenant le slug n'est
 * PAS validé contre une base (cf. story 4.1 Dev Notes). La structure
 * d'URL est conservée pour la future évolution multi-tenant (story 18.1).
 *
 * Cette page se contente d'assembler deux sections autonomes :
 *   1. <HeroSection>    → message principal + CTA primaire
 *   2. <JourneySection> → rassurance "3 étapes" + CTA secondaire
 *
 * Toute la logique d'animation / mise en page est portée par les
 * composants enfants, afin que cette page reste un simple "shell" SSR.
 *
 * @module app/(public)/[cabinet-slug]/page
 */

import type { Metadata } from "next";
import { HeroSection } from "@/components/public/HeroSection";
import { JourneySection } from "@/components/public/JourneySection";
import { CABINET_INFO } from "@/lib/cabinet/config";

export const metadata: Metadata = {
  title: `${CABINET_INFO.name} — Prendre rendez-vous en ligne`,
  description: `Réservez votre consultation au ${CABINET_INFO.name} en quelques clics. ${CABINET_INFO.openingHoursLabel}.`,
  openGraph: {
    title: `${CABINET_INFO.name} — Prendre rendez-vous`,
    description: `Réservez votre consultation en ligne. ${CABINET_INFO.openingHoursLabel}.`,
    type: "website",
  },
};

interface PageProps {
  // Next.js 15+ : `params` est une Promise → on doit l'attendre.
  params: Promise<{ "cabinet-slug": string }>;
}

export default async function CabinetLandingPage({ params }: PageProps) {
  const { "cabinet-slug": slug } = await params;

  return (
    <>
      <HeroSection slug={slug} />
      <JourneySection slug={slug} />
    </>
  );
}
