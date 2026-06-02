/**
 * Landing page publique du cabinet.
 *
 * Route : `/[cabinet-slug]` — pour le MVP single-tenant le slug n'est
 * PAS validé contre une base (cf. story 4.1 Dev Notes). La structure
 * d'URL est conservée pour la future évolution multi-tenant (story 18.1).
 *
 * Le profil public (nom, contact, horaires dérivés) provient désormais de
 * `getPublicCabinetProfile()` (story 7.4) — plus aucune identité codée en dur.
 *
 * @module app/(public)/[cabinet-slug]/page
 */

import type { Metadata } from "next";
import { CabinetHeader } from "@/components/public/CabinetHeader";
import { HeroSection } from "@/components/public/HeroSection";
import { JourneySection } from "@/components/public/JourneySection";
import { getPublicCabinetProfile } from "@/lib/cabinet/public-profile";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublicCabinetProfile();
  return {
    title: `${profile.name} — Prendre rendez-vous en ligne`,
    description: `Réservez votre consultation au ${profile.name} en quelques clics. ${profile.openingHoursLabel}.`,
    openGraph: {
      title: `${profile.name} — Prendre rendez-vous`,
      description: `Réservez votre consultation en ligne. ${profile.openingHoursLabel}.`,
      type: "website",
    },
  };
}

interface PageProps {
  // Next.js 15+ : `params` est une Promise → on doit l'attendre.
  params: Promise<{ "cabinet-slug": string }>;
}

export default async function CabinetLandingPage({ params }: PageProps) {
  const { "cabinet-slug": slug } = await params;
  const profile = await getPublicCabinetProfile();

  return (
    <>
      <HeroSection slug={slug} cabinetName={profile.name} />
      <section className="container mx-auto px-4 pb-12 md:pb-16">
        <CabinetHeader
          name={profile.name}
          address={profile.address}
          phone={profile.phone}
          email={profile.email}
          openingHoursLabel={profile.openingHoursLabel}
        />
      </section>
      <JourneySection slug={slug} />
    </>
  );
}
