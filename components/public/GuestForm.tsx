"use client";

/**
 * Formulaire patient invité (étape 2 du tunnel public — Story 4.2).
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/useBookingStore";
import { createGuestBooking } from "@/app/(public)/[cabinet-slug]/book/actions";
import {
  guestBookingSchema,
  type GuestBookingValues,
} from "@/lib/validations/booking";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface GuestFormProps {
  slotISO: string;
  cabinetSlug: string;
}

function formatFrPhone(raw: string) {
  const digits = raw.replace(/\D+/g, "").slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export function GuestForm({ slotISO, cabinetSlug }: GuestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const setLastAppointmentId = useBookingStore((s) => s.setLastAppointmentId);
  const reset = useBookingStore((s) => s.reset);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<GuestBookingValues>({
    resolver: zodResolver(guestBookingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      slotISO,
    },
    mode: "onTouched",
  });

  const values = watch();

  const onSubmit = (vals: GuestBookingValues) => {
    startTransition(async () => {
      const result = await createGuestBooking({ ...vals, slotISO });

      if ("success" in result) {
        setLastAppointmentId(result.appointmentId);
        showSuccess(TOAST_MESSAGES.booking.confirmed);
        router.push(`/${cabinetSlug}/book/success`);
        return;
      }

      if (result.error === "SLOT_TAKEN") {
        showError(TOAST_MESSAGES.errors.slotTaken);
        reset();
        router.replace(`/${cabinetSlug}/book`);
        return;
      }

      if (result.error === "VALIDATION") {
        showError(TOAST_MESSAGES.errors.validation);
        return;
      }

      showError(TOAST_MESSAGES.errors.server);
    });
  };

  const fieldState = (name: keyof GuestBookingValues) => ({
    error: errors[name]?.message,
    touched: !!touchedFields[name] || isSubmitted,
    hasValue: !!values[name],
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-busy={isPending || undefined}
      className="mt-1 flex flex-col gap-4"
    >
      <input type="hidden" defaultValue={slotISO} {...register("slotISO")} />

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Field id="firstName" label="Prénom" {...fieldState("firstName")}>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Jean"
            maxLength={40}
            defaultValue=""
            disabled={isPending}
            {...register("firstName")}
            className={fieldInputCn(fieldState("firstName"))}
          />
        </Field>
        <Field id="lastName" label="Nom" {...fieldState("lastName")}>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Dupont"
            maxLength={40}
            defaultValue=""
            disabled={isPending}
            {...register("lastName")}
            className={fieldInputCn(fieldState("lastName"))}
          />
        </Field>
      </div>

      <Field id="phone" label="Téléphone" {...fieldState("phone")}>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          maxLength={14}
          defaultValue=""
          disabled={isPending}
          {...register("phone", {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              const formatted = formatFrPhone(e.target.value);
              if (formatted !== e.target.value) {
                e.target.value = formatted;
                setValue("phone", formatted, {
                  shouldValidate: !!touchedFields.phone || isSubmitted,
                  shouldDirty: true,
                });
              }
            },
          })}
          className={fieldInputCn(fieldState("phone"))}
        />
      </Field>

      <Field id="email" label="Email" {...fieldState("email")}>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="jean.dupont@email.fr"
          defaultValue=""
          disabled={isPending}
          {...register("email")}
          className={fieldInputCn(fieldState("email"))}
        />
      </Field>

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending || undefined}
        className={cn(
          "mt-2 inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15.5px] font-semibold tracking-[-0.005em] text-white transition-all",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
          isPending
            ? "cursor-not-allowed bg-blue-600/75"
            : "bg-blue-600 shadow-[0_12px_32px_-10px_rgba(37,99,235,0.45),0_4px_10px_-4px_rgba(37,99,235,0.28)] hover:-translate-y-px hover:bg-blue-700 active:translate-y-0",
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
            <span>Confirmation en cours…</span>
          </>
        ) : (
          <span>Confirmer mon rendez-vous</span>
        )}
      </button>

      <p className="mt-1 inline-flex items-center justify-center gap-1.5 text-center text-xs leading-snug text-pretty text-slate-500">
        <Lock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          Vos informations sont sécurisées et ne servent qu&apos;à confirmer votre rendez-vous.
        </span>
      </p>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────── */

type FieldState = {
  error?: string;
  touched: boolean;
  hasValue: boolean;
};

function fieldInputCn({ error, touched, hasValue }: FieldState) {
  const showErr = touched && !!error;
  const showOk = touched && !error && hasValue;
  return cn(
    "h-12 w-full rounded-2xl border-[1.5px] bg-white px-3.5 text-[15px] tracking-[-0.005em] text-slate-900 transition-all placeholder:font-normal placeholder:text-slate-400",
    "focus:border-blue-600 focus:shadow-[0_0_0_4px_var(--color-blue-100,#dbeafe)] focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
    showErr && "border-rose-500 bg-rose-50/50 focus:shadow-[0_0_0_4px_#ffe4e6]",
    showOk && "border-emerald-500/50",
    !showErr && !showOk && "border-slate-200 hover:border-slate-300",
  );
}

function Field({
  id,
  label,
  error,
  touched,
  hasValue,
  children,
}: FieldState & {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const showErr = touched && !!error;
  const showOk = touched && !error && hasValue;
  const errId = `${id}-err`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="inline-flex items-baseline gap-1 text-[13.5px] font-medium tracking-[-0.005em] text-slate-700"
      >
        {label}
        <span aria-hidden="true" className="font-normal text-slate-400">
          *
        </span>
      </label>
      <div className="relative">
        {children}
        {showOk && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 inline-flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>
      {showErr && (
        <p
          id={errId}
          role="alert"
          className="mt-0.5 inline-flex items-start gap-1.5 text-[12.5px] leading-snug text-rose-600"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

