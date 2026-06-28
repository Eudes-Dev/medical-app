"use client";

/**
 * Fiche patient (refonte UI « Espace Patients »).
 *
 * Recompose la fiche détaillée selon le handoff Claude Design :
 * - En-tête héro premium (avatar dégradé déterministe, badge « Patient actif »,
 *   méta, cartes de contact) avec édition inline et suppression confirmée.
 * - Barre d'onglets animée (indicateur coulissant) regroupant les six sections du
 *   dossier, chacune réutilisée telle quelle (contrat fonctionnel inchangé) :
 *   Antécédents · Notes · Documents · Rendez-vous · Consentements · Droits RGPD.
 *
 * Contrat préservé : `updatePatient` / `deletePatient` appelés à l'identique ;
 * les sections reçoivent les mêmes props que précédemment.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Calendar,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react";

import { PatientForm } from "@/components/patients/patient-form";
import { MedicalHistory } from "@/components/patients/medical-history";
import { ConsultationNotes } from "@/components/patients/consultation-notes";
import { MedicalDocuments } from "@/components/patients/medical-documents";
import { AppointmentHistory } from "@/components/patients/appointment-history";
import { ConsentSection } from "@/components/patients/consent-section";
import { DataRightsSection } from "@/components/patients/data-rights-section";
import type { PatientDetail } from "@/app/dashboard/patients/actions";
import { updatePatient, deletePatient } from "@/app/dashboard/patients/actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

/* --------------------------------- Thème --------------------------------- */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const AV: [string, string][] = [
  ["#0ea5e9", "#06b6d4"],
  ["#6366f1", "#8b5cf6"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#ec4899", "#fb7185"],
  ["#3b82f6", "#6366f1"],
  ["#0d9488", "#22d3ee"],
  ["#8b5cf6", "#d946ef"],
];

function hueIdx(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % AV.length;
}

/* ---------------------------------- Props -------------------------------- */

export type PatientDetailClientProps = {
  patient: PatientDetail;
  medicalHistoryEntries: React.ComponentProps<typeof MedicalHistory>["entries"];
  consultationNotes: React.ComponentProps<typeof ConsultationNotes>["notes"];
  medicalDocuments: React.ComponentProps<typeof MedicalDocuments>["documents"];
  consentRecords: React.ComponentProps<typeof ConsentSection>["records"];
};

type TabKey =
  | "antecedents"
  | "notes"
  | "documents"
  | "rdv"
  | "consent"
  | "rights";

const TABS: { key: TabKey; label: string }[] = [
  { key: "antecedents", label: "Antécédents" },
  { key: "notes", label: "Notes" },
  { key: "documents", label: "Documents" },
  { key: "rdv", label: "Rendez-vous" },
  { key: "consent", label: "Consentements" },
  { key: "rights", label: "Droits RGPD" },
];

/* -------------------------------- Helpers -------------------------------- */

function formatDateShort(date: Date) {
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });
}

/* -------------------------------- Contact -------------------------------- */

function ContactCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-[11px] rounded-[15px] border border-slate-200/80 bg-white/70 px-3.5 py-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
          {label}
        </div>
        <div
          className={
            "truncate text-[13.5px] font-bold " +
            (muted ? "text-slate-400" : "text-slate-900")
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- PatientDetailClient ------------------------ */

export function PatientDetailClient({
  patient,
  medicalHistoryEntries,
  consultationNotes,
  medicalDocuments,
  consentRecords,
}: PatientDetailClientProps) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;

  const [currentPatient, setCurrentPatient] =
    React.useState<PatientDetail>(patient);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>("antecedents");

  React.useEffect(() => {
    setCurrentPatient(patient);
  }, [patient]);

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

  const handleDelete = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await deletePatient(currentPatient.id);
      if (!result.success) {
        showError(TOAST_MESSAGES.errors.server);
        return;
      }
      showSuccess(TOAST_MESSAGES.patient.deleted);
      router.push("/dashboard/patients");
      router.refresh();
    } catch (error) {
      console.error("[PatientDetailClient] deletePatient error:", error);
      showError(TOAST_MESSAGES.errors.server);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPatient.id, router]);

  const initials = `${currentPatient.firstName.charAt(0)}${currentPatient.lastName.charAt(0)}`.toUpperCase();
  const c = AV[hueIdx(currentPatient.firstName + currentPatient.lastName)];
  const fullName = `${currentPatient.firstName} ${currentPatient.lastName}`;
  const activeIndex = TABS.findIndex((t) => t.key === activeTab);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      {isEditing ? (
        /* ----- Mode édition ----- */
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="rounded-[24px] border border-slate-200/80 bg-white p-6"
          style={{ boxShadow: "0 18px 44px -30px rgba(15,23,42,.22)" }}
        >
          <div className="mb-[18px] flex items-center gap-2.5">
            <Edit3 size={20} className="text-sky-600" />
            <h2 className="m-0 text-[17px] font-extrabold text-slate-900">
              Modifier le profil
            </h2>
          </div>
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
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              className="rounded-[11px] border border-slate-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      ) : (
        /* ----- Héro ----- */
        <motion.section
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative overflow-hidden rounded-[24px] border border-slate-200/80 p-6"
          style={{
            background: "linear-gradient(135deg,#fff 0%,#f4faff 100%)",
            boxShadow: "0 18px 44px -30px rgba(15,23,42,.22)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
            style={{
              background:
                "radial-gradient(circle,rgba(14,165,233,.1),transparent 70%)",
            }}
          />
          <div className="relative flex flex-wrap items-start gap-[18px]">
            <div
              className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-[22px] text-[27px] font-extrabold text-white"
              style={{
                background: `linear-gradient(135deg,${c[0]},${c[1]})`,
                boxShadow: `0 14px 30px -12px ${c[1]}cc`,
              }}
            >
              {initials}
            </div>
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="m-0 text-[25px] font-extrabold tracking-[-0.03em] text-slate-900">
                  {fullName}
                </h1>
                <span className="inline-flex items-center gap-[7px] rounded-full bg-emerald-50 px-3 py-[5px] text-[12.5px] font-bold text-emerald-700">
                  <span className="relative h-[7px] w-[7px]">
                    <span className="absolute inset-0 rounded-full bg-emerald-500" />
                    {!reduce && (
                      <span
                        className="absolute inset-0 rounded-full bg-emerald-500"
                        style={{ animation: "pdPulse 2.4s infinite" }}
                      />
                    )}
                  </span>
                  Patient actif
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[13.5px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-slate-400" />
                  Patient depuis {formatDateShort(currentPatient.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-[12px] border border-slate-200/90 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-900 transition-all hover:-translate-y-px hover:bg-slate-50 disabled:opacity-60"
              >
                <Edit3 size={16} />
                Modifier le profil
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-[12px] bg-rose-500 px-4 py-2.5 text-[13.5px] font-bold text-white hover:bg-rose-600 disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isSubmitting}
                    className="rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-[12px] border border-rose-200 bg-white px-4 py-2.5 text-[13.5px] font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              )}
            </div>
          </div>

          {/* Cartes de contact */}
          <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ContactCard
              icon={<Phone size={17} />}
              iconBg="#e0f2fe"
              iconColor="#0284c7"
              label="Téléphone"
              value={currentPatient.phone}
            />
            <ContactCard
              icon={<Mail size={17} />}
              iconBg="#eef2ff"
              iconColor="#6366f1"
              label="Email"
              value={currentPatient.email || "Non renseigné"}
              muted={!currentPatient.email}
            />
            <ContactCard
              icon={<MapPin size={17} />}
              iconBg="#ecfdf5"
              iconColor="#059669"
              label="Adresse"
              value="Non renseignée"
              muted
            />
          </div>
        </motion.section>
      )}

      {/* Barre d'onglets */}
      <div className="relative mt-1">
        <div className="relative flex gap-1 overflow-x-auto rounded-[15px] border border-slate-200/80 bg-slate-100 p-[5px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[5px] top-[5px] hidden rounded-[11px] bg-white md:block"
            style={{
              width: `calc((100% - 10px) / ${TABS.length})`,
              left: 5,
              transform: `translateX(calc(${activeIndex} * 100%))`,
              transition: reduce ? "none" : "transform .4s cubic-bezier(.22,1,.36,1)",
              boxShadow: "0 3px 10px -3px rgba(15,23,42,.2)",
            }}
          />
          {TABS.map((t) => {
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                aria-pressed={active}
                className={
                  "relative z-[2] shrink-0 whitespace-nowrap rounded-[11px] px-3.5 py-2.5 text-[13.5px] transition-colors md:flex-1 md:px-1 " +
                  (active
                    ? "font-bold text-slate-900 max-md:bg-white max-md:shadow-sm"
                    : "font-semibold text-slate-500 hover:text-slate-700")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panneaux */}
      <motion.div
        key={activeTab}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="mt-1"
      >
        {activeTab === "antecedents" && (
          <MedicalHistory
            patientId={currentPatient.id}
            entries={medicalHistoryEntries}
          />
        )}
        {activeTab === "notes" && (
          <ConsultationNotes
            patientId={currentPatient.id}
            notes={consultationNotes}
          />
        )}
        {activeTab === "documents" && (
          <MedicalDocuments
            patientId={currentPatient.id}
            documents={medicalDocuments}
          />
        )}
        {activeTab === "rdv" && (
          <AppointmentHistory appointments={currentPatient.appointments} />
        )}
        {activeTab === "consent" && (
          <ConsentSection
            patientId={currentPatient.id}
            records={consentRecords}
          />
        )}
        {activeTab === "rights" && (
          <DataRightsSection
            patientId={currentPatient.id}
            patientName={fullName}
          />
        )}
      </motion.div>

      <style>{`@keyframes pdPulse { 0% { transform: scale(.7); opacity: .55 } 70% { transform: scale(2.6); opacity: 0 } 100% { opacity: 0 } }`}</style>
    </div>
  );
}
