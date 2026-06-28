"use client";

/**
 * Sheet de création de patient (refonte UI « Espace Patients »).
 *
 * Recrée fidèlement le panneau latéral du handoff Claude Design :
 * - Overlay flouté + panneau slide-in depuis la droite (`motion`).
 * - En-tête à pastille dégradée (titre + sous-titre) et bouton de fermeture.
 * - Champs en grille avec libellés, marqueurs requis et erreurs inline animées.
 * - Encart RGPD (données chiffrées) et footer (Annuler / Créer le patient + spinner).
 *
 * Contrat préservé : même API publique (`open`/`onOpenChange`/`onPatientCreated`,
 * trigger en mode non contrôlé), même Server Action `createPatient` et même
 * validation Zod isomorphe (`patientSchema`). Raccourcis : Échap ferme,
 * Ctrl/Cmd+Entrée soumet.
 */

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { Loader2, ShieldCheck, UserPlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  patientSchema,
  type PatientFormValues,
} from "@/lib/validations/patients";
import { createPatient } from "@/app/dashboard/patients/actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

/**
 * Type de résultat attendu depuis la Server Action createPatient.
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
   * Mode contrôlé: si fournis, le panneau est contrôlé par le parent (pas de trigger).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Appelé après création réussie avec le patient créé. */
  onPatientCreated?: (patient: CreatedPatient) => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ------------------------------ Champ de saisie -------------------------- */

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  autoFocus?: boolean;
  registration: React.ComponentProps<"input">;
};

function Field({
  label,
  required,
  error,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  disabled,
  autoFocus,
  registration,
}: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        {...registration}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        className={cn(
          "w-full rounded-[12px] border px-[13px] py-[11px] text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400",
          error
            ? "border-rose-300 bg-rose-50/60 focus:shadow-[0_0_0_4px_rgba(244,63,94,.14)]"
            : "border-slate-200/90 bg-slate-50 focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,.16)]",
        )}
      />
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mt-1.5 text-xs font-medium text-rose-600"
            aria-live="polite"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- CreatePatientModal -------------------------- */

export function CreatePatientModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPatientCreated,
}: CreatePatientModalProps = {}) {
  const isControlled =
    controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const reduce = useReducedMotion() ?? false;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", email: "" },
  });

  const onValid = React.useCallback(
    async (values: PatientFormValues) => {
      setIsSubmitting(true);
      try {
        const result = (await createPatient(values)) as CreatePatientResult;
        if (!result || !("success" in result)) {
          showError(TOAST_MESSAGES.errors.server);
          return;
        }
        if (result.success) {
          showSuccess(TOAST_MESSAGES.patient.created, {
            description: `${result.patient.firstName} ${result.patient.lastName} a été ajouté à votre base de patients.`,
          });
          onPatientCreated?.(result.patient);
          reset();
          setOpen(false);
        } else {
          showError(TOAST_MESSAGES.errors.validation);
        }
      } catch (error) {
        console.error("[CreatePatientModal] createPatient error:", error);
        showError(TOAST_MESSAGES.errors.server);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onPatientCreated, reset, setOpen],
  );

  const close = React.useCallback(() => {
    if (isSubmitting) return;
    setOpen(false);
  }, [isSubmitting, setOpen]);

  // Raccourcis clavier (Échap ferme, Ctrl/Cmd+Entrée soumet) + lock du scroll.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        void handleSubmit(onValid)();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, handleSubmit, onValid]);

  return (
    <>
      {/* Trigger uniquement en mode non contrôlé (page patients / EmptyState) */}
      {!isControlled && (
        <motion.button
          type="button"
          onClick={() => setInternalOpen(true)}
          whileHover={reduce ? undefined : { y: -1, scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          className="inline-flex items-center gap-2 rounded-[13px] px-[17px] py-[11px] text-sm font-bold text-white"
          style={{
            background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
            boxShadow: "0 10px 22px -10px rgba(14,165,233,.75)",
          }}
        >
          <UserPlus className="h-[18px] w-[18px]" />
          Nouveau patient
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay flouté */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={close}
              className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-[3px]"
              aria-hidden
            />

            {/* Panneau */}
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="Nouveau patient"
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: reduce ? 0.2 : 0.4, ease: EASE }}
              className="fixed inset-y-0 right-0 z-[95] flex w-full max-w-[460px] flex-col bg-white shadow-[-30px_0_60px_-30px_rgba(15,23,42,.4)]"
            >
              {/* En-tête */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-[26px] pb-[18px] pt-6">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] text-white"
                    style={{
                      background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                      boxShadow: "0 10px 22px -10px rgba(14,165,233,.7)",
                    }}
                  >
                    <UserPlus className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="m-0 text-lg font-extrabold tracking-[-0.02em] text-slate-900">
                      Nouveau patient
                    </h2>
                    <p className="mt-0.5 text-[13px] text-slate-400">
                      Renseignez les informations du dossier.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer"
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border border-slate-100 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Corps */}
              <form
                id="create-patient-form"
                onSubmit={handleSubmit(onValid)}
                noValidate
                className="flex-1 overflow-y-auto px-[26px] py-[22px]"
              >
                <div className="grid grid-cols-2 gap-3.5">
                  <Field
                    label="Prénom"
                    required
                    autoFocus
                    placeholder="Camille"
                    autoComplete="given-name"
                    disabled={isSubmitting}
                    error={errors.firstName?.message}
                    registration={register("firstName")}
                  />
                  <Field
                    label="Nom"
                    required
                    placeholder="Laurent"
                    autoComplete="family-name"
                    disabled={isSubmitting}
                    error={errors.lastName?.message}
                    registration={register("lastName")}
                  />
                </div>

                <div className="mt-3.5">
                  <Field
                    label="Email"
                    type="email"
                    placeholder="camille.laurent@email.fr"
                    autoComplete="email"
                    disabled={isSubmitting}
                    error={errors.email?.message}
                    registration={register("email")}
                  />
                </div>

                <div className="mt-3.5">
                  <Field
                    label="Téléphone"
                    required
                    placeholder="0612345678"
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={isSubmitting}
                    error={errors.phone?.message}
                    registration={register("phone")}
                  />
                </div>

                {/* Encart RGPD */}
                <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-sky-100 bg-sky-50 px-[15px] py-[13px]">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-sky-600"
                  />
                  <p className="m-0 text-[12.5px] leading-[1.5] text-sky-800">
                    Les données patients sont chiffrées et conformes RGPD. Le
                    consentement de soins sera demandé à la première consultation.
                  </p>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-[26px] py-4">
                <button
                  type="button"
                  onClick={close}
                  disabled={isSubmitting}
                  className="rounded-[12px] border border-slate-200/90 bg-white px-[18px] py-[11px] text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  form="create-patient-form"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-[12px] px-5 py-[11px] text-sm font-bold text-white disabled:opacity-80"
                  style={{
                    background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                    boxShadow: "0 10px 22px -10px rgba(14,165,233,.75)",
                  }}
                >
                  {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                  {isSubmitting ? "Création…" : "Créer le patient"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
