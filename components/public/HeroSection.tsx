/**
 * HeroSection — Première section ("au-dessus du pli") de la landing publique.
 *
 * Maquette source : story 4.1, screenshot fourni par le PO.
 *
 * Composition :
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  • Badge "ouvert" (point vert pulsant)                  │
 *  │  • Titre fort sur 2 lignes                              │
 *  │  • Sous-titre rassurant                                 │
 *  │  • CTA primaire + micro-preuve "Sans création de compte"│
 *  │                                                         │
 *  │  À droite : mockup d'agenda flottant (purement décoratif│
 *  │  → marqué aria-hidden, pas de contenu sémantique)       │
 *  └─────────────────────────────────────────────────────────┘
 *
 * Animations (toutes en boucle infinie, désactivées si
 * `prefers-reduced-motion: reduce`) :
 *   - point vert "live"   → pulsation + halo concentrique
 *   - carte mockup        → lévitation douce (float)
 *   - barres internes     → shimmer (effet "skeleton vivant")
 *   - checkmark vert      → pop-in à l'arrivée (one-shot)
 *
 * @module components/public/HeroSection
 */

import Link from "next/link";
import { ArrowRight, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  /** Slug du cabinet — utilisé pour construire le lien vers le tunnel. */
  slug: string;
  /** Nom du cabinet (profil persisté, story 7.4) — remplace l'ancienne chaîne en dur. */
  cabinetName: string;
}

export function HeroSection({ slug, cabinetName }: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-title"
      // min-h ≈ 1 écran moins le header (~80px) pour matcher la maquette.
      className="relative flex min-h-[calc(100vh-5rem)] items-center"
    >
      <div className="container mx-auto grid items-center gap-12 px-4 py-12 md:grid-cols-2 md:gap-8 md:py-20">
        {/* COLONNE GAUCHE — Texte + CTA -------------------------------- */}
        <div className="flex flex-col gap-6">
          {/* Badge "ouvert" avec point vert pulsant ------------------- */}
          <div className="anim-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/80 py-1.5 pr-4 pl-2 text-xs font-medium tracking-wide text-foreground shadow-xs backdrop-blur">
            {/* Wrapper relatif pour pouvoir empiler le halo derrière */}
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {/* Halo qui s'étire en boucle (pulse-ring) */}
              <span className="anim-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
              {/* Cœur du point (pulse-dot) */}
              <span className="anim-pulse-dot relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="uppercase">La prise de rendez-vous est ouverte</span>
          </div>

          {/* Titre — accent couleur sur la deuxième ligne ------------- */}
          <h1
            id="hero-title"
            className="anim-fade-up anim-delay-100 text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl"
          >
            Votre santé,
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              sans complication.
            </span>
          </h1>

          {/* Sous-titre ----------------------------------------------- */}
          <p className="anim-fade-up anim-delay-200 max-w-lg text-base text-muted-foreground md:text-lg">
            Prenez rendez-vous en quelques secondes avec l&apos;équipe médicale du{" "}
            <span className="font-medium text-foreground">{cabinetName}</span>.
            Une organisation pensée pour réduire votre temps d&apos;attente.
          </p>

          {/* CTA + micro-preuve --------------------------------------- */}
          <div className="anim-fade-up anim-delay-300 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="group h-12 min-h-[44px] rounded-full bg-primary px-7 text-base font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              <Link
                href={`/${slug}/book`}
                aria-label="Démarrer la prise de rendez-vous"
              >
                Prendre rendez-vous
                {/* Flèche qui glisse au survol — micro-interaction */}
                <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>

            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              Sans création de compte
            </span>
          </div>
        </div>

        {/* COLONNE DROITE — Mockup décoratif --------------------------- */}
        {/* aria-hidden : ce visuel ne porte aucune info utile pour AT. */}
        <div
          aria-hidden
          className="relative mx-auto hidden h-80 w-full max-w-md md:block"
        >
          {/* Halo bleuté derrière la carte (parallaxe statique) */}
          <div className="absolute inset-x-6 top-8 bottom-0 rounded-3xl bg-primary/15 blur-2xl" />

          {/* Carte principale en lévitation infinie */}
          <div className="anim-float anim-fade-up anim-delay-200 absolute inset-0 rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
            {/* En-tête de la carte : barre titre + icône calendrier */}
            <div className="flex items-center justify-between">
              <div className="anim-shimmer h-3 w-2/5 rounded-full" />
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </span>
            </div>

            {/* Mini-grille type "mois" : 4 cases dont une mise en avant */}
            <div className="mt-6 grid grid-cols-4 gap-2">
              <div className="anim-shimmer h-14 rounded-xl" />
              <div className="anim-shimmer anim-delay-100 h-14 rounded-xl" />
              {/* Case "active" — Indigo doux, numéro mis en avant */}
              <div className="flex h-14 items-center justify-center rounded-xl bg-primary/15 font-semibold text-primary ring-1 ring-primary/30">
                14
              </div>
              <div className="anim-shimmer anim-delay-200 h-14 rounded-xl" />
            </div>

            {/* Ligne "confirmation" en bas : check + barre */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-background p-3 shadow-sm">
              <span className="anim-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-2.5 w-3/4 rounded-full bg-foreground/80" />
                <div className="anim-shimmer h-2 w-1/2 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
