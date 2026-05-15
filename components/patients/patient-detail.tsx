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
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type MedicalDocument = {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  type: "pdf" | "image";
};

const MOCK_PRACTITIONER_NAME = "Dr. Jean Dupont";

const MOCK_MEDICAL_DOCUMENTS: MedicalDocument[] = [
  {
    id: "1",
    name: "Blood_Test_Results.pdf",
    size: "2,4 Mo",
    uploadedAt: "Ajouté le 05/03/2026",
    type: "pdf",
  },
  {
    id: "2",
    name: "X-Ray_Report.png",
    size: "1,5 Mo",
    uploadedAt: "Ajouté le 21/02/2026",
    type: "image",
  },
];

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
          "Une erreur est survenue lors de la mise à jour du patient.",
        );
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
        toast.error(result.error);
        return;
      }

      toast.success("Patient supprimé avec succès");

      // Retour à la liste des patients
      router.push("/dashboard/patients");
      router.refresh();
    } catch (error) {
      console.error("[PatientDetailClient] deletePatient error:", error);
      toast.error("Une erreur est survenue lors de la suppression du patient.");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPatient.id, router]);

  const hasAppointments = currentPatient.appointments.length > 0;

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

      {/* Historique des rendez-vous */}
      <section>
        <Card className="border border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-sky-600" />
              <CardTitle className="text-base font-semibold">
                Historique des rendez-vous
              </CardTitle>
            </div>
            <Button size="sm" variant="outline">
              Nouveau rendez-vous
            </Button>
          </CardHeader>
          <CardContent>
            {hasAppointments ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center border-b bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                  <span>Date & heure</span>
                  <span>Type de consultation</span>
                  <span>Statut</span>
                  <span>Praticien</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y">
                  {currentPatient.appointments.map(
                    (appointment: PatientAppointment) => (
                      <div
                        key={appointment.id}
                        className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center px-4 py-3 text-sm"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            {formatDate(appointment.startTime)}
                          </p>
                        </div>
                        <div className="text-sm text-slate-700">
                          {appointment.type}
                        </div>
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {getAppointmentStatusLabel(appointment.status)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700">
                          {MOCK_PRACTITIONER_NAME}
                        </div>
                        <div className="text-right">
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="h-auto px-0 text-xs font-semibold text-sky-600"
                          >
                            <a
                              href={`/dashboard/appointments/${appointment.id}`}
                            >
                              Voir les détails
                            </a>
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <div className="border-t bg-slate-50 px-4 py-2 text-center text-xs font-medium text-sky-600">
                  Charger plus d&apos;historique
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun rendez-vous enregistré pour ce patient.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Documents médicaux */}
      <section>
        <Card className="border border-slate-200/80 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-600" />
              <CardTitle className="text-base font-semibold">
                Documents médicaux
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Zone de drop */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800">
                  Glissez-déposez vos fichiers ici
                </p>
                <p className="text-xs text-muted-foreground">
                  ou{" "}
                  <button
                    type="button"
                    className="font-semibold text-sky-600 underline-offset-2 hover:underline"
                  >
                    cliquez pour les sélectionner
                  </button>{" "}
                  depuis votre ordinateur.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Formats supportés : PDF, PNG, JPG. Taille maximale 10 Mo.
              </p>
            </div>

            {/* Liste des documents récents */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Récemment ajoutés
              </p>
              <div className="divide-y rounded-xl border border-slate-200 bg-white">
                {MOCK_MEDICAL_DOCUMENTS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.size} • {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                        aria-label="Prévisualiser le document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                        aria-label="Télécharger le document"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
