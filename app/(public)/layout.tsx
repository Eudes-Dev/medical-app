/**
 * Layout du route group public (sans authentification).
 *
 * Utilisé par toutes les pages accessibles aux patients invités :
 * - `/[cabinet-slug]`        (landing)
 * - `/[cabinet-slug]/book`   (tunnel de réservation)
 *
 * Le header reprend l'identité visuelle des maquettes story 4.1 :
 *   • logo "cœur" sur pastille bleue + nom du cabinet + sous-titre métier
 *   • bouton "téléphone" arrondi à droite, lien tel: pour usage mobile
 *
 * Le footer reste sobre — discret pour ne pas concurrencer le CTA.
 *
 * @module app/(public)/layout
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { HeartPulse, Phone } from "lucide-react";
import { CABINET_DEFAULT_SLUG } from "@/lib/cabinet/config";
import { getPublicCabinetProfile } from "@/lib/cabinet/public-profile";

/**
 * Rendu dynamique forcé : le layout lit le profil cabinet en base à chaque
 * rendu. Sans ce flag, Next.js tente de prérendre statiquement les pages du
 * groupe (ex. `/unsubscribe`) au build, où la base est injoignable (ENETUNREACH
 * sur Vercel). Ces surfaces dépendent de données runtime — aucune n'est statique.
 */
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // Identité du cabinet lue depuis le profil persisté (story 7.4).
  const profile = await getPublicCabinetProfile();
  // Numéro nettoyé pour le href `tel:` (les espaces cassent la composition iOS).
  const phoneHref = `tel:${profile.phone.replace(/\s/g, "")}`;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Blobs décoratifs en fond — fixes derrière toute la page publique.
          Animés en boucle infinie (drift très lent), pointer-events none
          pour ne jamais intercepter les clics. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="anim-blob absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="anim-blob anim-delay-300 absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      {/* HEADER ----------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          {/* Logo + identité cabinet ------------------------------------ */}
          <Link
            href={`/${CABINET_DEFAULT_SLUG}`}
            className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`Retour à l'accueil — ${profile.name}`}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105"
              aria-hidden
            >
              <HeartPulse className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground md:text-base">
                {profile.name}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground md:text-xs">
                Médecine générale
              </span>
            </span>
          </Link>

          {/* Bouton téléphone arrondi ----------------------------------- */}
          <a
            href={phoneHref}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary md:px-4 md:text-sm"
            aria-label={`Appeler le cabinet au ${profile.phone}`}
          >
            <Phone className="h-3.5 w-3.5 text-primary md:h-4 md:w-4" />
            <span>{profile.phone}</span>
          </a>
        </div>
      </header>

      {/* CONTENU --------------------------------------------------------- */}
      <main className="flex flex-1 flex-col">{children}</main>

      {/* FOOTER ---------------------------------------------------------- */}
      <footer className="mt-auto border-t border-border/60 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground md:text-sm">
          <p>
            © {new Date().getFullYear()} {profile.name} —{" "}
            {profile.address}
          </p>
        </div>
      </footer>
    </div>
  );
}
