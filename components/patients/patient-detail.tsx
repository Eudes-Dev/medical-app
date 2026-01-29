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
import { CalendarClock, Edit2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientForm } from "@/components/patients/patient-form";
import type {
  PatientDetail,
  PatientAppointment,
} from "@/app/dashboard/patients/actions";
import { updatePatient, deletePatient } from "@/app/dashboard/patients/actions";
import { toast } from "@/components/ui/sonner";

/**
 * Props du composant PatientDetailClient.
 *
 * - `patient`: données complètes du patient (y compris historique)
 */
export type PatientDetailClientProps = {
  patient: PatientDetail;
};

/**
 * Formate une date en chaîne lisible en français.
 */
function formatDate(date: Date) {
  return new Date(date).toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calcule un label lisible pour le statut d'un rendez-vous.
 */
function getAppointmentStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "CONFIRMED":
      return "Confirmé";
    case "CANCELLED":
      return "Annulé";
    case "COMPLETED":
      return "Terminé";
    default:
      return status;
  }
}

/**
 * Composant principal de fiche patient (client).
 */
export function PatientDetailClient({ patient }: PatientDetailClientProps) {
  const router = useRouter();

  // État local pour refléter les modifications sans rechargement complet
  const [currentPatient, setCurrentPatient] = React.useState<PatientDetail>(
    patient
  );

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
          toast.error(result.error);
          return;
        }

        setCurrentPatient(result.patient);
        setIsEditing(false);

        toast.success("Patient mis à jour avec succès");

        // Recharger doucement la page pour refléter les données serveur
        router.refresh();
      } catch (error) {
        console.error("[PatientDetailClient] updatePatient error:", error);
        toast.error(
          "Une erreur est survenue lors de la mise à jour du patient."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPatient.id, router]
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
      "Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est définitive."
    );
    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const result = await deletePatient(currentPatient.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Patient supprimé avec succès");

      // Retour à la liste des patients
      router.push("/dashboard/patients");
      router.refresh();
    } catch (error) {
      console.error("[PatientDetailClient] deletePatient error:", error);
      toast.error(
        "Une erreur est survenue lors de la suppression du patient."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPatient.id, router]);

  const hasAppointments = currentPatient.appointments.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Carte d'informations principales du patient */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">
              {currentPatient.firstName} {currentPatient.lastName}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Créé le {formatDate(currentPatient.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Modifier: bascule entre affichage et édition */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing((prev) => !prev)}
              disabled={isSubmitting}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {isEditing ? "Annuler" : "Modifier"}
            </Button>

            {/* Bouton Supprimer (hard delete) */}
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
        </CardHeader>
        <CardContent>
          {isEditing ? (
            // Mode édition: réutilisation du PatientForm avec valeurs par défaut
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
          ) : (
            // Mode lecture: affichage simple des informations
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Nom
                </dt>
                <dd className="text-sm">
                  {currentPatient.lastName} {currentPatient.firstName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Téléphone
                </dt>
                <dd className="text-sm">{currentPatient.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="text-sm">
                  {currentPatient.email || (
                    <span className="text-muted-foreground">Non renseigné</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Dernière mise à jour
                </dt>
                <dd className="text-sm">{formatDate(currentPatient.updatedAt)}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Historique des rendez-vous */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Historique des rendez-vous</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAppointments ? (
            <ul className="space-y-2">
              {currentPatient.appointments.map(
                (appointment: PatientAppointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {formatDate(appointment.startTime)}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({appointment.type})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Statut : {getAppointmentStatusLabel(appointment.status)}
                      </p>
                    </div>
                    {/* Lien vers le rendez-vous individuel.
                        Le chemin exact sera défini dans la story RDV.
                        Pour l'instant, on utilise un placeholder clair. */}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <a href={`/dashboard/appointments/${appointment.id}`}>
                        Voir le RDV
                      </a>
                    </Button>
                  </li>
                )
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun rendez-vous enregistré pour ce patient.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

