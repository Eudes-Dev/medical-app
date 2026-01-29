 "use client";

/**
 * Formulaire de création / édition de patient.
 *
 * Ce composant est réutilisable pour:
 * - la création d'un nouveau patient
 * - la modification d'un patient existant
 *
 * Il s'appuie sur:
 * - react-hook-form + zodResolver pour la validation (côté client)
 * - le composant `InputGroup` pour des champs cohérents (label + input + erreur)
 *
 * La persistance (Server Actions, API, etc.) est déléguée au parent via la prop `onSubmit`.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { InputGroup } from "@/components/ui/input-group";
import {
  patientSchema,
  type PatientFormValues,
} from "@/lib/validations/patients";

/**
 * Props du composant `PatientForm`.
 */
export type PatientFormProps = {
  /**
   * Valeurs par défaut du formulaire.
   * - Création: champs vides par défaut
   * - Édition: valeurs existantes du patient
   */
  defaultValues?: Partial<PatientFormValues>;

  /**
   * Callback appelé lorsque le formulaire est validé côté client.
   * - Reçoit des données déjà conformes à `patientSchema`.
   */
  onSubmit: (values: PatientFormValues) => Promise<void> | void;

  /**
   * Libellé du bouton de soumission (ex: "Créer", "Enregistrer les modifications").
   *
   * @default "Enregistrer"
   */
  submitLabel?: string;

  /**
   * Permet au parent d'indiquer qu'une action asynchrone est en cours
   * (ex: appel Server Action), afin de désactiver les champs/bouton.
   *
   * @default false
   */
  isSubmitting?: boolean;
};

/**
 * `PatientForm` encapsule la logique de formulaire (react-hook-form + Zod)
 * pour la création / édition d'un patient, en utilisant `InputGroup`
 * comme brique de base pour chaque champ.
 */
export function PatientForm({
  defaultValues,
  onSubmit,
  submitLabel = "Enregistrer",
  isSubmitting = false,
}: PatientFormProps) {
  /**
   * Initialisation du formulaire.
   *
   * - `zodResolver(patientSchema)` branche le schéma Zod sur react-hook-form.
   * - `defaultValues` permet de réutiliser le formulaire en mode édition.
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isSubmittingRHF },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      ...defaultValues,
    },
  });

  // On combine l'état de soumission interne (react-hook-form) et externe (prop)
  const isBusy = isSubmitting || isSubmittingRHF;

  /**
   * Handler de soumission.
   *
   * - Appelé uniquement si la validation Zod est passée.
   * - Délègue au callback fourni par le parent.
   */
  async function handleValidSubmit(values: PatientFormValues) {
    await onSubmit(values);
  }

  return (
    <form
      onSubmit={handleSubmit(handleValidSubmit)}
      className="space-y-4"
      noValidate
    >
      {/* Champ Nom de famille */}
      <InputGroup
        label="Nom"
        placeholder="Martin"
        autoComplete="family-name"
        disabled={isBusy}
        error={errors.lastName?.message}
        {...register("lastName")}
      />

      {/* Champ Prénom */}
      <InputGroup
        label="Prénom"
        placeholder="Jean"
        autoComplete="given-name"
        disabled={isBusy}
        error={errors.firstName?.message}
        {...register("firstName")}
      />

      {/* Champ Téléphone */}
      <InputGroup
        label="Téléphone"
        placeholder="0612345678"
        autoComplete="tel"
        inputMode="tel"
        disabled={isBusy}
        error={errors.phone?.message}
        {...register("phone")}
      />

      {/* Champ Email (optionnel) */}
      <InputGroup
        label="Email"
        type="email"
        placeholder="patient@exemple.com"
        autoComplete="email"
        disabled={isBusy}
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Bouton de soumission aligné sur le design system */}
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full bg-[#2563eb] hover:bg-[#2563eb]/90"
          disabled={isBusy}
        >
          {isBusy ? "En cours..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

