"use client";

/**
 * LoadingButton — wrapper du Button animate-ui qui ajoute un état de chargement.
 *
 * Story 5.1 AC 3, 12 :
 * - affiche un spinner + un texte (`loadingText`, défaut « Chargement… »)
 * - passe en `disabled` + `aria-busy="true"` quand `isLoading`
 * - conserve un focus visible (ring Tailwind hérité du Button)
 *
 * NB rev 1.2 de la story demandait un Spinner animate-ui : aucun composant
 * Spinner n'est publié sur animate-ui.com (vérifié, seul Button existe). On
 * utilise Loader2 de lucide-react — divergence documentée en Completion Notes.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Button,
  type ButtonProps,
} from "@/components/animate-ui/components/buttons/button";

/**
 * Le `Button` animate-ui dérive ses props des types polymorphes de motion +
 * Slot, dont l'intersection rend `children` non-optionnel et restreint son
 * union. On contourne via `ComponentProps` (relâché) puis on impose une
 * version ReactNode standard de `children` pour conserver l'ergonomie.
 */
type RelaxedButtonProps = Omit<ButtonProps, "children"> & {
  children?: React.ReactNode;
};

/**
 * `ButtonProps` d'animate-ui repose sur les types polymorphes de `motion/react`
 * dont les membres ne sont pas statiquement connus : on ne peut pas étendre
 * via `interface ... extends`. On utilise une intersection avec `&` pour
 * conserver l'inférence tout en ajoutant nos deux props.
 */
export type LoadingButtonProps = RelaxedButtonProps & {
  isLoading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  isLoading = false,
  loadingText = "Chargement…",
  children,
  disabled,
  ...rest
}: LoadingButtonProps) {
  // Cast volontaire : `Button` animate-ui exige une `children` non-undefined
  // via son union avec `Slot.asChild`. On a toujours du contenu (loadingText
  // ou children), donc le cast est sûr.
  const ButtonAny = Button as unknown as React.ComponentType<
    Record<string, unknown>
  >;

  return (
    <ButtonAny
      {...(rest as Record<string, unknown>)}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </ButtonAny>
  );
}
