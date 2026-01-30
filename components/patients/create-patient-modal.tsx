"use client";

/**
 * Modal de création de patient.
 *
 * Ce composant:
 * - Affiche un bouton "Nouveau Patient" (SheetTrigger)
 * - Ouvre un Sheet Shadcn contenant le `PatientForm`
 * - Appelle la Server Action `createPatient` à la soumission
 * - Affiche des toasts de succès / erreur (story 2.2, AC: 1, 3, 4, 5)
 * - Déclenche un rechargement des données via revalidation côté serveur
 *
 * Il est conçu pour être utilisé directement dans la page `/dashboard/patients`.
 */

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { PatientForm } from "@/components/patients/patient-form";
import type { PatientFormValues } from "@/lib/validations/patients";
import { createPatient } from "@/app/dashboard/patients/actions";

/**
 * Type de résultat attendu depuis la Server Action createPatient.
 *
 * On le redéfinit ici pour documenter le contrat côté client.
 */
type CreatePatientResult =
  | {
      success: true;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
      };
    }
  | {
      success: false;
      error: string;
    };

/** Patient minimal retourné après création (pour pré-sélection dans PatientSelect, etc.) */
export type CreatedPatient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
};

export interface CreatePatientModalProps {
  /**
   * Mode contrôlé: si fournis, le Sheet est contrôlé par le parent (pas de trigger).
   * Utilisé par PatientSelect pour ouvrir le modal via "Nouveau patient".
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Appelé après création réussie avec le patient créé (rafraîchir liste, pré-sélectionner). */
  onPatientCreated?: (patient: CreatedPatient) => void;
}

/**
 * Composant CreatePatientModal.
 *
 * - Gère l'état d'ouverture du Sheet (ou mode contrôlé via open/onOpenChange)
 * - Gère l'état de soumission (spinner/bouton désactivé)
 * - Centralise l'appel à la Server Action et la gestion des toasts
 * - En mode contrôlé, pas de bouton trigger (le parent ouvre le modal)
 */
export function CreatePatientModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPatientCreated,
}: CreatePatientModalProps = {}) {
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // État de soumission (empêche les doublons)
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /**
   * Handler appelé par `PatientForm` lorsque le formulaire est valide.
   *
   * - Appelle la Server Action `createPatient`
   * - Affiche des toasts de succès / erreur
   * - Notifie le parent via onPatientCreated si fourni
   * - Ferme le modal en cas de succès
   */
  const handleSubmit = React.useCallback(
    async (values: PatientFormValues) => {
      setIsSubmitting(true);

      try {
        const result = (await createPatient(values)) as CreatePatientResult;

        if (!result || !("success" in result)) {
          toast.error(
            "La création du patient a échoué. Veuillez réessayer plus tard."
          );
          return;
        }

        if (result.success) {
          toast.success("Patient créé avec succès", {
            description: `${result.patient.firstName} ${result.patient.lastName} a été ajouté à votre base de patients.`,
          });
          onPatientCreated?.(result.patient);
          setOpen(false);
        } else {
          toast.error(result.error || "La création du patient a échoué.");
        }
      } catch (error) {
        console.error("[CreatePatientModal] createPatient error:", error);
        toast.error(
          "Une erreur inattendue est survenue lors de la création du patient."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [onPatientCreated, setOpen]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Trigger uniquement en mode non contrôlé (page patients) */}
      {!isControlled && (
        <SheetTrigger asChild>
          <Button className="bg-[#2563eb] hover:bg-[#2563eb]/90">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Patient
          </Button>
        </SheetTrigger>
      )}

      {/* Contenu du Sheet (modal latéral) */}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Créer un nouveau patient</SheetTitle>
          <SheetDescription>
            Renseignez les informations du patient. Tous les champs sont
            obligatoires sauf l&apos;email.
          </SheetDescription>
        </SheetHeader>

        {/* Formulaire de création */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
          <PatientForm
            onSubmit={handleSubmit}
            submitLabel="Créer"
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Footer avec bouton d'annulation (fermeture du Sheet) */}
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Annuler
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

