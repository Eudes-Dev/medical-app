"use client";

/**
 * Composant InputGroup - Champ de formulaire avec label et message d'erreur
 *
 * Ce composant combine Label, Input et message d'erreur dans un pattern
 * réutilisable pour tous les formulaires de l'application.
 *
 * Compatible avec react-hook-form via forwardRef.
 *
 * @module components/ui/input-group
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Props du composant InputGroup.
 */
export interface InputGroupProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Libellé du champ */
  label: string;
  /** Message d'erreur à afficher (optionnel) */
  error?: string;
  /** Description ou aide sous le label (optionnel) */
  description?: string;
}

/**
 * Composant InputGroup - Champ de formulaire complet.
 *
 * Structure:
 * - Label avec attribut htmlFor automatique
 * - Description optionnelle sous le label
 * - Input avec style d'erreur conditionnel
 * - Message d'erreur sous l'input
 *
 * Design System:
 * - Erreurs: Rose-500 (texte et bordure)
 * - Espacement: space-y-2 entre les éléments
 *
 * @example
 * ```tsx
 * // Usage simple
 * <InputGroup
 *   label="Email"
 *   type="email"
 *   placeholder="exemple@email.com"
 *   error={errors.email?.message}
 *   {...register("email")}
 * />
 *
 * // Avec description
 * <InputGroup
 *   label="Mot de passe"
 *   type="password"
 *   description="Minimum 6 caractères"
 *   error={errors.password?.message}
 *   {...register("password")}
 * />
 * ```
 */
const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(
  ({ className, label, error, description, id, ...props }, ref) => {
    // Générer un ID unique (useId est toujours appelé pour respecter les règles des hooks)
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-2">
        {/* Label */}
        <Label htmlFor={inputId}>{label}</Label>

        {/* Description optionnelle */}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {/* Input */}
        <Input
          id={inputId}
          ref={ref}
          className={cn(error && "border-rose-500 focus-visible:ring-rose-500", className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />

        {/* Message d'erreur */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-rose-500"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputGroup.displayName = "InputGroup";

export { InputGroup };
