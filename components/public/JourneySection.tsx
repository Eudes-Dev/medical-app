/**
 * JourneySection — Deuxième section ("Un parcours simplifié").
 *
 * Maquette source : story 4.1, screenshot fourni par le PO.
 *
 * Présente le tunnel de réservation en 3 étapes pour rassurer
 * l'utilisateur AVANT le clic sur "Commencer" :
 *   1. Choisir un créneau
 *   2. Vos coordonnées
 *   3. Confirmation immédiate
 *
 * Détails UX :
 *  - La 1ʳᵉ étape porte un point vert "live" (l'utilisateur est ici).
 *  - Les connecteurs entre étapes sont des pointillés "ant-march" qui
 *    défilent en boucle → suggère la progression, sans agressivité.
 *  - Sur mobile, le stepper bascule en vertical (la barre de connexion
 *    également) — les pointillés deviennent verticaux via `bg-position-x`.
 *
 * @module components/public/JourneySection
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JourneySectionProps {
  slug: string;
}

/** Étapes du tunnel — source de vérité unique pour le rendu. */
const STEPS = [
  {
    number: 1,
    title: "Choisir un créneau",
    description:
      "Sélectionnez le motif de consultation et choisissez l'heure qui vous convient.",
  },
  {
    number: 2,
    title: "Vos coordonnées",
    description:
      "Renseignez vos informations de base. Pas de mot de passe à retenir, jamais.",
  },
  {
    number: 3,
    title: "Confirmation immédiate",
    description:
      "C'est validé. Vous recevrez un SMS de rappel 24h avant votre visite.",
  },
] as const;

export function JourneySection({ slug }: JourneySectionProps) {
  return (
    <section
      aria-labelledby="journey-title"
      className="relative py-16 md:py-24"
    >
      <div className="container mx-auto px-4">
        {/* En-tête centré ------------------------------------------------ */}
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="journey-title"
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            Un parcours simplifié
          </h2>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            Prendre rendez-vous ne devrait pas être compliqué.
          </p>
        </div>

        {/* Stepper visuel ------------------------------------------------- */}
        {/* Layout responsive :
              - mobile : colonne (gap vertical + connecteurs verticaux)
              - md+    : ligne avec connecteurs horizontaux */}
        <ol
          className="relative mx-auto mt-12 grid max-w-5xl gap-12 md:mt-16 md:grid-cols-3 md:gap-0"
          role="list"
        >
          {STEPS.map((step, index) => {
            const isFirst = index === 0;
            const isLast = index === STEPS.length - 1;

            return (
              <li
                key={step.number}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connecteur en pointillés (placé AVANT le rond pour
                    qu'il passe DERRIÈRE visuellement grâce au z-index).
                    On le rend sur toutes les cartes sauf la dernière. */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="anim-dash pointer-events-none absolute top-7 left-[calc(50%+2.25rem)] hidden h-px w-[calc(100%-4.5rem)] md:block"
                    // Tirets faits avec un background-image répété — animé
                    // via @keyframes dash-march (cf. globals.css).
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, var(--border) 50%, transparent 50%)",
                      backgroundSize: "12px 1px",
                      backgroundRepeat: "repeat-x",
                    }}
                  />
                )}

                {/* Rond numéroté ------------------------------------- */}
                <div
                  className={[
                    "anim-fade-up relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-background text-lg font-semibold shadow-md",
                    isFirst
                      ? "border-primary/30 text-primary"
                      : "border-border text-muted-foreground",
                    // Stagger d'apparition à l'ouverture de la page
                    index === 0 ? "" : index === 1 ? "anim-delay-100" : "anim-delay-200",
                  ].join(" ")}
                  aria-current={isFirst ? "step" : undefined}
                >
                  {/* Balayage de lumière sur l'étape active uniquement
                      → rappelle subtilement "vous êtes ici". */}
                  {isFirst && (
                    <span
                      aria-hidden
                      className="anim-sweep absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
                    />
                  )}
                  <span className="relative">{step.number}</span>

                  {/* Point vert "live" en bas à droite du rond actif */}
                  {isFirst && (
                    <span
                      aria-hidden
                      className="absolute right-1 bottom-1 flex h-2.5 w-2.5 items-center justify-center"
                    >
                      <span className="anim-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                      <span className="anim-pulse-dot relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </div>

                {/* Titre + description ------------------------------- */}
                <h3 className="mt-6 text-base font-semibold text-foreground md:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>

        {/* CTA secondaire "Commencer" ------------------------------------ */}
        <div className="mt-12 flex justify-center md:mt-16">
          <Button
            asChild
            size="lg"
            className="group h-12 min-h-[44px] rounded-full bg-foreground px-8 text-base font-semibold text-background shadow-md transition-all hover:scale-[1.02] hover:bg-foreground/90 hover:shadow-lg"
          >
            <Link
              href={`/${slug}/book`}
              aria-label="Commencer la prise de rendez-vous"
            >
              Commencer
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
