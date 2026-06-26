"use client";

/**
 * Composant de fiche patient (partie client).
 *
 * Ce composant reçoit les données du patient depuis le Server Component
 * et gère:
 * - L'affichage des informations principales (Nom, Prénom, Téléphone, Email)
 * - L'historique des rendez-vous (date, statut, type)
 * - Le mode édition (réutilisation de `PatientForm`)
 * - Les actions de mise à jour et suppression avec toasts
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Edit3, Mail, MapPin, Phone, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PatientForm } from "@/components/patients/patient-form";
import { AppointmentHistory } from "@/components/patients/appointment-history";
import type { PatientDetail } from "@/app/dashboard/patients/actions";
import { updatePatient, deletePatient } from "@/app/dashboard/patients/actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

/**
 * Props du composant PatientDetailClient.
 *
 * - `patient`: données complètes du patient (y compris historique)
 */
export type PatientDetailClientProps = {
  patient: PatientDetail;
};

/**
 * Formate une date sans l'heure (pour les métadonnées de profil).
 */
function formatDateShort(date: Date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/**
 * Composant principal de fiche patient (client).
 */
export function PatientDetailClient({ patient }: PatientDetailClientProps) {
  const router = useRouter();

  // État local pour refléter les modifications sans rechargement complet
  const [currentPatient, setCurrentPatient] =
    React.useState<PatientDetail>(patient);

  // État du mode édition
  const [isEditing, setIsEditing] = React.useState(false);
  // État de soumission des actions (update/delete)
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /**
   * Handler d'édition du patient.
   *
   * - Appelle la Server Action `updatePatient`
   * - Met à jour l'état local si succès
   * - Affiche des toasts de succès / erreur
   */
  const handleUpdate = React.useCallback(
    async (values: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string | null;
    }) => {
      setIsSubmitting(true);
      try {
        const result = await updatePatient(currentPatient.id, {
          ...values,
          email: values.email ?? undefined,
        });

        if (!result.success) {
          showError(TOAST_MESSAGES.errors.validation);
          return;
        }

        setCurrentPatient(result.patient);
        setIsEditing(false);

        showSuccess(TOAST_MESSAGES.patient.updated);

        // Recharger doucement la page pour refléter les données serveur
        router.refresh();
      } catch (error) {
        console.error("[PatientDetailClient] updatePatient error:", error);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPatient.id, router],
  );

  /**
   * Handler de suppression du patient.
   *
   * - Demande une confirmation utilisateur
   * - Appelle `deletePatient`
   * - Redirige vers la liste des patients si succès
   */
  const handleDelete = React.useCallback(async () => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est définitive.",
    );
    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const result = await deletePatient(currentPatient.id);

      if (!result.success) {
        showError(TOAST_MESSAGES.errors.server);
        return;
      }

      showSuccess(TOAST_MESSAGES.patient.deleted);

      // Retour à la liste des patients
      router.push("/dashboard/patients");
      router.refresh();
    } catch (error) {
      console.error("[PatientDetailClient] deletePatient error:", error);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPatient.id, router]);

  const initials = `${currentPatient.firstName.charAt(
    0,
  )}${currentPatient.lastName.charAt(0)}`;

  return (
    <div className="flex flex-col gap-8 max-w-5xl justify-center w-full">
      {/* Carte de profil patient (header) */}
      <section>
        <Card className="overflow-hidden border-none shadow-none">
          <CardContent className="p-0 border-none shadow-none">
            <div className="flex flex-col gap-6 px-6 pt-6 pb-4 md:flex-row md:items-center md:justify-between  ">
              {/* Avatar et nom prenom */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 rounded-2xl shadow-2xl">
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-base font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      {currentPatient.firstName} {currentPatient.lastName}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xl">
                      <span className=" flex  mr-1 relative size-1.5">
                        <span className="rounded-full absolute inline-flex w-full h-full opacity-75 bg-emerald-500" />
                        <span className="size-1.5 relative inline-flex rounded-full bg-emerald-500 animate-ping" />
                      </span>
                      <span>Actif</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {/* Pas encore de date de naissance en base, on affiche uniquement la date de création du dossier. */}
                    Membre depuis le {formatDateShort(currentPatient.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing((prev) => !prev)}
                  disabled={isSubmitting}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  {isEditing ? "Annuler" : "Modifier le profil"}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>

            {/* Zone contact ou formulaire d'édition */}
            {isEditing ? (
              <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                <PatientForm
                  defaultValues={{
                    firstName: currentPatient.firstName,
                    lastName: currentPatient.lastName,
                    phone: currentPatient.phone,
                    email: currentPatient.email ?? "",
                  }}
                  onSubmit={handleUpdate}
                  submitLabel="Enregistrer les modifications"
                  isSubmitting={isSubmitting}
                />
              </div>
            ) : (
              <div className="grid gap-4 border-t border-slate-200 bg-slate-50/70 px-6 py-4 md:grid-cols-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mt-1 rounded-lg bg-sky-50 p-2 text-sky-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Adresse e-mail
                    </p>
                    <p className="text-sm">
                      {currentPatient.email || (
                        <span className="text-muted-foreground">
                          Non renseigné
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mt-1 rounded-lg bg-sky-50 p-2 text-sky-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Numéro de téléphone
                    </p>
                    <p className="text-sm">{currentPatient.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mt-1 rounded-lg bg-sky-50 p-2 text-sky-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Adresse physique
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Adresse non renseignée
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Historique des rendez-vous (handoff Claude Design — story 9.4) */}
      <section>
        <AppointmentHistory appointments={currentPatient.appointments} />
      </section>
    </div>
  );
}
