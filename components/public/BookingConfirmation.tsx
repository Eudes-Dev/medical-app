"use client";

/**
 * Composant Client pour la page de confirmation (Story 4.3).
 *
 * Reçoit les données du rendez-vous depuis le Server Component parent et
 * gère les interactions:
 * - Copie de la référence
 * - Toggles rappels SMS/Email (état local pour le MVP)
 * - Modale d'annulation
 * - Reset du `useBookingStore` au montage
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell,
  Calendar as CalendarIcon,
  Check,
  Copy,
  Download,
  ExternalLink,
  IdCard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Stethoscope,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/useBookingStore";

interface ConfirmationAppointment {
  id: string;
  startTime: string; // ISO
  durationMin: number;
  email: string | null;
  phone: string;
  doctorName: string;
  doctorSpeciality: string;
  cabinetName: string;
  cabinetAddress: string;
}

interface Props {
  appointment: ConfirmationAppointment;
  cabinetSlug: string;
}

export function BookingConfirmation({ appointment, cabinetSlug }: Props) {
  const reset = useBookingStore((s) => s.reset);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    reset();
  }, [reset]);

  const slot = new Date(appointment.startTime);

  return (
    <>
      <SuccessHero appointment={appointment} slot={slot} />
      <CalendarRow appointment={appointment} slot={slot} />
      <RemindersCard appointment={appointment} />
      <PracticalCard appointment={appointment} />
      <ManageStrip
        cabinetSlug={cabinetSlug}
        onCancel={() => setShowCancel(true)}
      />
      <CancelModal
        open={showCancel}
        slot={slot}
        onClose={() => setShowCancel(false)}
        onConfirm={() => setShowCancel(false)}
      />
    </>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────── */

function SuccessHero({
  appointment,
  slot,
}: {
  appointment: ConfirmationAppointment;
  slot: Date;
}) {
  return (
    <section className="relative flex flex-col items-center px-0 pt-3 pb-1 text-center" aria-labelledby="cf-hero-title">
      <div className="relative mb-[18px] inline-flex h-[88px] w-[88px] items-center justify-center text-emerald-600">
        <svg
          viewBox="0 0 64 64"
          width="56"
          height="56"
          aria-hidden="true"
          className="relative z-[2] [filter:drop-shadow(0_6px_18px_rgba(16,185,129,0.30))]"
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="#10b981"
            style={{
              transformOrigin: "center",
              animation: "cf-bounce-in .55s cubic-bezier(.2,1.4,.4,1)",
            }}
          />
          <path
            d="M20 33 l8 8 l16 -18"
            fill="none"
            stroke="white"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 40,
              strokeDashoffset: 40,
              animation: "cf-draw .35s .35s ease-out forwards",
            }}
          />
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-500"
          style={{ opacity: 0, transform: "scale(0.6)", animation: "cf-ripple 1.4s ease-out .1s forwards" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-500"
          style={{ opacity: 0, transform: "scale(0.6)", animation: "cf-ripple 1.4s ease-out .35s forwards" }}
        />
      </div>
      <h1
        id="cf-hero-title"
        className="m-0 mb-1.5 text-[30px] leading-[1.1] font-semibold tracking-[-0.028em] text-balance text-slate-900 md:text-[36px]"
      >
        Rendez‑vous confirmé
      </h1>
      <p className="m-0 mb-[22px] max-w-[460px] text-[15px] leading-relaxed text-pretty text-slate-500">
        {appointment.email ? (
          <>
            Un email de confirmation a été envoyé à{" "}
            <strong className="font-semibold text-slate-800">{appointment.email}</strong>.
          </>
        ) : (
          <>Votre rendez-vous est bien enregistré.</>
        )}
      </p>

      <div className="w-full rounded-3xl border border-slate-200 bg-white px-[18px] py-1.5 text-left shadow-[0_4px_12px_-2px_rgba(15,23,42,0.06),0_2px_4px_-1px_rgba(15,23,42,0.04)] md:px-[22px]">
        <HeroRow icon={<CalendarIcon className="h-4 w-4" />} label="Date & heure">
          <span className="capitalize">{format(slot, "EEEE d MMMM yyyy", { locale: fr })}</span>
          <span className="tabular-nums"> · {format(slot, "HH:mm")}</span>
          <span className="font-medium text-slate-500"> ({appointment.durationMin}&nbsp;min)</span>
        </HeroRow>
        <HeroRow icon={<Stethoscope className="h-4 w-4" />} label="Praticien">
          {appointment.doctorName}
          <span className="font-medium text-slate-500"> · {appointment.doctorSpeciality}</span>
        </HeroRow>
        <HeroRow icon={<MapPin className="h-4 w-4" />} label="Lieu">
          {appointment.cabinetName}
          <span className="font-medium text-slate-500"> · {appointment.cabinetAddress}</span>
        </HeroRow>
        <HeroRow icon={<IdCard className="h-4 w-4" />} label="Référence">
          <CopyableRef value={appointment.id} />
        </HeroRow>
      </div>
    </section>
  );
}

function HeroRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 border-b border-dashed border-slate-200 py-3.5 last:border-0">
      <span className="mt-px inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
          {label}
        </span>
        <span className="text-[15px] leading-[1.35] font-semibold tracking-[-0.01em] text-slate-900">
          {children}
        </span>
      </div>
    </div>
  );
}

function CopyableRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(value);
    } catch {
      /* noop */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copier la référence ${value}`}
      className="inline-flex items-center gap-2.5 self-start rounded-full border border-slate-200 bg-slate-50 py-1 pr-1 pl-2.5 font-mono text-[13px] font-medium tracking-[-0.005em] text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="tabular-nums">{value}</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-sans text-xs font-medium text-blue-700">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copié" : "Copier"}
      </span>
    </button>
  );
}

/* ─── Calendar row ─────────────────────────────────────────────── */

function toCalDate(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function CalendarRow({
  appointment,
  slot,
}: {
  appointment: ConfirmationAppointment;
  slot: Date;
}) {
  const end = new Date(slot.getTime() + appointment.durationMin * 60_000);
  const title = encodeURIComponent(`Rendez-vous — ${appointment.doctorName}`);
  const detail = encodeURIComponent(
    `${appointment.cabinetName} · ${appointment.cabinetAddress}\nRéférence : ${appointment.id}`,
  );
  const loc = encodeURIComponent(appointment.cabinetAddress);

  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${toCalDate(slot)}/${toCalDate(end)}&details=${detail}&location=${loc}`;
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${detail}&startdt=${slot.toISOString()}&enddt=${end.toISOString()}&location=${loc}&path=/calendar/action/compose&rru=addevent`;

  const icsBody = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${appointment.cabinetName}//Booking//FR`,
    "BEGIN:VEVENT",
    `UID:${appointment.id}@booking`,
    `DTSTAMP:${toCalDate(new Date())}`,
    `DTSTART:${toCalDate(slot)}`,
    `DTEND:${toCalDate(end)}`,
    `SUMMARY:Rendez-vous — ${appointment.doctorName}`,
    `LOCATION:${appointment.cabinetAddress}`,
    `DESCRIPTION:${appointment.cabinetName} · Référence : ${appointment.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const icsHref = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsBody);

  return (
    <section className="flex flex-col gap-2.5 pt-1" aria-label="Ajouter à votre calendrier">
      <span className="px-0.5 text-[11.5px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
        Ajouter à votre calendrier
      </span>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <CalButton href={gcal} external label="Google" />
        <CalButton href={outlook} external label="Outlook" />
        <CalButton href={icsHref} download={`rdv-${appointment.id}.ics`} label="Apple / .ics" trailing={<Download className="h-3.5 w-3.5" />} />
      </div>
    </section>
  );
}

function CalButton({
  href,
  label,
  external,
  download,
  trailing,
}: {
  href: string;
  label: string;
  external?: boolean;
  download?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      download={download}
      className="group inline-flex h-12 items-center gap-2.5 rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 text-sm font-medium tracking-[-0.005em] text-slate-800 no-underline transition-all hover:-translate-y-px hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-blue-600">
        <CalendarIcon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 min-w-0">{label}</span>
      {trailing ?? <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />}
    </a>
  );
}

/* ─── Reminders ────────────────────────────────────────────────── */

function RemindersCard({ appointment }: { appointment: ConfirmationAppointment }) {
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(!!appointment.email);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onToggle = (key: "sms" | "email", val: boolean) => {
    if (key === "sms") setSms(val);
    else setEmail(val);
    startTransition(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }, 380);
    });
  };

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-[18px] pb-4 md:p-[22px] md:pb-[18px]"
      aria-labelledby="cf-rem-title"
    >
      <header className="mb-1 flex items-center gap-2.5">
        <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-blue-50 text-blue-600">
          <Bell className="h-3.5 w-3.5" />
        </span>
        <h2 id="cf-rem-title" className="m-0 text-[14.5px] font-semibold tracking-[-0.005em] text-slate-900">
          Rappels avant le rendez-vous
        </h2>
        <span
          aria-live="polite"
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 transition-all",
            saved ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-0.5 opacity-0",
          )}
        >
          <Check className="h-3 w-3" /> Enregistré
        </span>
      </header>
      <ToggleRow
        id="rem-sms"
        icon={<Phone className="h-3.5 w-3.5" />}
        title="SMS la veille à 18h"
        sub={`au ${appointment.phone}`}
        checked={sms}
        onChange={(v) => onToggle("sms", v)}
        disabled={pending}
      />
      <ToggleRow
        id="rem-email"
        icon={<Mail className="h-3.5 w-3.5" />}
        title="Email 2 heures avant"
        sub={appointment.email ? `à ${appointment.email}` : "aucun email renseigné"}
        checked={email}
        onChange={(v) => onToggle("email", v)}
        disabled={pending || !appointment.email}
      />
    </section>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-[18px] pb-4 md:p-[22px] md:pb-[18px]">
      <header className="mb-1 flex items-center gap-2.5">
        <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-blue-50 text-blue-600">
          {icon}
        </span>
        <h2 className="m-0 text-[14.5px] font-semibold tracking-[-0.005em] text-slate-900">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  id,
  icon,
  title,
  sub,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "mt-1 flex items-center gap-3 border-t border-dashed border-slate-200 px-1 py-3 transition hover:bg-slate-50",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700" aria-hidden="true">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium tracking-[-0.005em] text-slate-900">{title}</span>
        <span className="text-[12.5px] text-slate-500">{sub}</span>
      </span>
      <span className={cn("relative inline-block h-[22px] w-[38px] shrink-0 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-slate-300")}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,.15),0_1px_1px_rgba(15,23,42,.08)] transition-transform duration-200",
            checked && "translate-x-4",
          )}
        />
        <span aria-hidden="true" className="absolute inset-0 rounded-full peer-focus-visible:shadow-[0_0_0_3px_#dbeafe]" />
      </span>
    </label>
  );
}

/* ─── Practical info ───────────────────────────────────────────── */

function PracticalCard({ appointment }: { appointment: ConfirmationAppointment }) {
  return (
    <Card title="Avant de venir" icon={<MapPin className="h-3.5 w-3.5" />}>
      <ul className="my-3 flex list-none flex-col gap-3 p-0">
        <ChecklistItem>
          <strong className="font-semibold text-slate-900">Apportez</strong> votre carte Vitale et une pièce d&apos;identité.
        </ChecklistItem>
        <ChecklistItem>
          <strong className="font-semibold text-slate-900">Présentez-vous</strong> 5 minutes avant l&apos;heure prévue.
        </ChecklistItem>
        <ChecklistItem>
          <strong className="font-semibold text-slate-900">Tarif consultation</strong> : 30&nbsp;€, conventionné secteur&nbsp;1.
          <span className="mt-0.5 block text-[13px] text-slate-500">Carte bancaire, chèque ou espèces.</span>
        </ChecklistItem>
      </ul>
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(appointment.cabinetAddress)}`}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-medium text-slate-800 no-underline transition hover:border-blue-300 hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span>Itinéraire vers le cabinet</span>
        <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600" />
      </a>
    </Card>
  );
}

function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-[1.45] text-slate-700">
      <span className="mt-px inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-3 w-3" strokeWidth={2.5} />
      </span>
      <div>{children}</div>
    </li>
  );
}

/* ─── Manage strip ─────────────────────────────────────────────── */

function ManageStrip({
  cabinetSlug,
  onCancel,
}: {
  cabinetSlug: string;
  onCancel: () => void;
}) {
  return (
    <section
      aria-label="Gérer votre rendez-vous"
      className="mt-1 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-[18px] py-4 md:flex-row md:items-center md:justify-between md:py-3.5"
    >
      <p className="m-0 text-[13px] leading-[1.45] text-pretty text-slate-600">
        Un imprévu&nbsp;? Vous pouvez modifier ou annuler à tout moment, sans frais jusqu&apos;à 24h avant.
      </p>
      <div className="flex gap-2">
        <a
          href={`/${cabinetSlug}/book`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 no-underline transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reporter</span>
        </a>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <X className="h-3.5 w-3.5" />
          <span>Annuler</span>
        </button>
      </div>
    </section>
  );
}

/* ─── Cancel modal ─────────────────────────────────────────────── */

function CancelModal({
  open,
  slot,
  onClose,
  onConfirm,
}: {
  open: boolean;
  slot: Date;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cf-cancel-title"
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
    >
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        style={{ animation: "cf-fade .2s ease" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[440px] rounded-t-3xl bg-white px-[22px] pt-6 pb-5 shadow-[0_12px_28px_-8px_rgba(15,23,42,0.10),0_4px_8px_-4px_rgba(15,23,42,0.05)] md:rounded-3xl"
        style={{ animation: "cf-rise .25s cubic-bezier(.2,1.1,.4,1)" }}
      >
        <h3 id="cf-cancel-title" className="m-0 mb-2 text-xl font-semibold tracking-[-0.015em] text-slate-900">
          Annuler ce rendez-vous&nbsp;?
        </h3>
        <p className="m-0 mb-[22px] text-sm leading-[1.5] text-pretty text-slate-600">
          Le créneau du {format(slot, "EEEE d MMMM yyyy", { locale: fr })} à{" "}
          <strong className="font-semibold text-slate-900">{format(slot, "HH:mm")}</strong> sera libéré pour un autre patient. Cette action est définitive.
        </p>
        <div className="flex flex-col gap-2 md:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500 px-[18px] text-sm font-semibold text-white shadow-[0_8px_18px_-6px_rgba(244,63,94,0.4)] transition hover:-translate-y-px hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 md:ml-auto"
          >
            Annuler le rendez-vous
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-[18px] text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Garder mon rendez-vous
          </button>
        </div>
      </div>
    </div>
  );
}
