"use client";

/**
 * Section « Historique des rendez-vous » de la fiche patient (épopée 9).
 *
 * Reprend fidèlement le handoff Claude Design « Améliorer le design de la data
 * table » (`Historique RDV.dc.html`), adapté au langage visuel du dossier
 * patient : thème sky/cyan (cf. `patient-record-ui`), `motion/react`, coins très
 * arrondis, ombres douces.
 *
 * Fonctionnalités :
 * - Onglets de filtre Tous / À venir / Terminés avec compteurs.
 * - Lignes dépliables révélant Motif / Durée / Modalité / Lieu / Note.
 * - Badges de statut avec pastille animée (pulse pour les RDV actifs).
 * - Icône colorée par type de consultation, avatar praticien.
 * - « Charger plus » paginé avec lignes squelettes animées.
 *
 * Aucune logique métier réseau : reçoit la liste déjà chargée par le serveur.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Stethoscope,
  Video,
  type LucideIcon,
} from "lucide-react";

import { ACCENT, ACCENT_GRADIENT, EASE, SECTION_SHADOW } from "@/components/patients/patient-record-ui";
import type { PatientAppointment } from "@/app/dashboard/patients/actions";

/* --------------------------------- Types --------------------------------- */

export type AppointmentHistoryProps = {
  /** Rendez-vous du patient (déjà triés du plus récent au plus ancien). */
  appointments: PatientAppointment[];
  /** Praticien affiché (single-tenant). */
  practitionerName?: string;
  /** Densité d'affichage des lignes (parité maquette). */
  density?: "Confort" | "Compact";
  /** Afficher les avatars praticien dans la colonne dédiée. */
  showAvatars?: boolean;
};

type FilterKey = "tous" | "avenir" | "termines";

type StatusMeta = {
  label: string;
  fg: string;
  bg: string;
  ring: string;
  dot: string;
  pulse: boolean;
};

/* ------------------------------- Constantes ------------------------------ */

const DEFAULT_PRACTITIONER = "Dr. Jean Dupont";
const PAGE_SIZE = 5;
const PAGE_STEP = 3;

/** Mapping statut Prisma → présentation (couleurs cohérentes avec le dossier). */
const STATUS_META: Record<string, StatusMeta> = {
  PENDING: { label: "En attente", fg: "#B45309", bg: "#FFFBEB", ring: "#FDE68A", dot: "#D97706", pulse: true },
  CONFIRMED: { label: "Confirmé", fg: "#0369A1", bg: "#F0F9FF", ring: "#BAE6FD", dot: "#0EA5E9", pulse: true },
  COMPLETED: { label: "Terminé", fg: "#047857", bg: "#ECFDF5", ring: "#A7F3D0", dot: "#10B981", pulse: false },
  CANCELLED: { label: "Annulé", fg: "#BE123C", bg: "#FFF1F2", ring: "#FECDD3", dot: "#F43F5E", pulse: false },
};

const FALLBACK_STATUS: StatusMeta = {
  label: "Inconnu",
  fg: "#475569",
  bg: "#F1F5F9",
  ring: "#E2E8F0",
  dot: "#94A3B8",
  pulse: false,
};

/** Icône + couleur déduites du libellé de type de consultation. */
function typeVisual(type: string): { Icon: LucideIcon; color: string } {
  const t = type.toLowerCase();
  if (/(téléconsult|teleconsult|visio|vidéo|video)/.test(t)) return { Icon: Video, color: "#0EA5E9" };
  if (/bilan/.test(t)) return { Icon: Activity, color: "#10B981" };
  if (/(première|premiere)/.test(t)) return { Icon: ClipboardList, color: "#6366F1" };
  if (/urgence/.test(t)) return { Icon: AlertTriangle, color: "#EF4444" };
  if (/(post-op|post op|post-opératoire|postoperatoire)/.test(t)) return { Icon: RefreshCw, color: "#06B6D4" };
  return { Icon: Stethoscope, color: "#8B5CF6" };
}

/* -------------------------------- Helpers -------------------------------- */

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Durée lisible déduite de start/end (« 30 min », « 1 h 15 »). */
function formatDuration(start: Date, end: Date): string | null {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, "0")}`;
}

function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

const HEADER_TH =
  "px-[18px] py-3 text-left align-middle text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400 bg-slate-50/70 border-y border-slate-100";

/* ------------------------------ StatusBadge ------------------------------ */

function StatusBadge({ meta, reduce }: { meta: StatusMeta; reduce: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-[10px] py-[5px] text-[12.5px] font-semibold"
      style={{ background: meta.bg, color: meta.fg, borderColor: meta.ring }}
    >
      <span className="relative inline-flex size-2 shrink-0">
        {meta.pulse && !reduce && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: meta.dot, animation: "rdvDotPulse 1.9s ease-out infinite" }}
          />
        )}
        <span className="relative block size-2 rounded-full" style={{ background: meta.dot }} />
      </span>
      {meta.label}
    </span>
  );
}

/* ------------------------------- DetailCell ------------------------------ */

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </div>
      <div className="text-[13.5px] font-semibold text-slate-800">{value}</div>
    </div>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

const SKELETON_WIDTHS = ["78px", "150px", "90px", "120px", "84px"];

function SkeletonRow() {
  return (
    <tr>
      {SKELETON_WIDTHS.map((w, i) => (
        <td key={i} className="border-b border-slate-100 px-[18px] py-[18px]">
          <div
            className="h-3.5 rounded-md"
            style={{
              width: w,
              marginLeft: i === SKELETON_WIDTHS.length - 1 ? "auto" : undefined,
              background:
                "linear-gradient(90deg,#EEF2F7 25%,#F8FAFC 37%,#EEF2F7 63%)",
              backgroundSize: "450px 100%",
              animation: "rdvShimmer 1.3s infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ----------------------------- EmptyState -------------------------------- */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Calendar className="size-7" />
      </span>
      <p className="max-w-xs text-sm font-medium text-slate-500">
        Aucun rendez-vous enregistré — les consultations de ce patient
        apparaîtront ici.
      </p>
    </div>
  );
}

/* --------------------------- AppointmentHistory -------------------------- */

export function AppointmentHistory({
  appointments,
  practitionerName = DEFAULT_PRACTITIONER,
  density = "Confort",
  showAvatars = true,
}: AppointmentHistoryProps) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;

  const [filter, setFilter] = React.useState<FilterKey>("tous");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const rowPad = density === "Compact" ? "11px" : "17px";
  const initials = initialsOf(practitionerName);

  // Compteurs (sur l'ensemble, indépendants du filtre courant).
  const counts = React.useMemo(() => {
    let avenir = 0;
    let termines = 0;
    for (const a of appointments) {
      if (a.status === "PENDING" || a.status === "CONFIRMED") avenir += 1;
      if (a.status === "COMPLETED") termines += 1;
    }
    return { tous: appointments.length, avenir, termines };
  }, [appointments]);

  const filtered = React.useMemo(() => {
    if (filter === "tous") return appointments;
    if (filter === "avenir")
      return appointments.filter(
        (a) => a.status === "PENDING" || a.status === "CONFIRMED",
      );
    return appointments.filter((a) => a.status === "COMPLETED");
  }, [appointments, filter]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const remaining = filtered.length - visible;

  const changeFilter = (next: FilterKey) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
    setExpanded({});
  };

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadMore = () => {
    if (loading) return;
    setLoading(true);
    timer.current = setTimeout(() => {
      setVisible((v) => v + PAGE_STEP);
      setLoading(false);
    }, 780);
  };

  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "tous", label: "Tous", count: counts.tous },
    { key: "avenir", label: "À venir", count: counts.avenir },
    { key: "termines", label: "Terminés", count: counts.termines },
  ];

  const skeletonCount = Math.min(PAGE_STEP, Math.max(remaining, 1));
  const rowTransition = reduce
    ? { duration: 0.2 }
    : { duration: 0.5, ease: EASE };

  return (
    <motion.section
      data-screen-label="Historique des rendez-vous"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white"
      style={{ boxShadow: SECTION_SHADOW }}
    >
      {/* Keyframes locales (pulse / shimmer) — équivalent du mockup. */}
      <style>{`
        @keyframes rdvDotPulse { 0% { transform: scale(1); opacity: .5 } 70% { transform: scale(2.6); opacity: 0 } 100% { opacity: 0 } }
        @keyframes rdvShimmer { 0% { background-position: -450px 0 } 100% { background-position: 450px 0 } }
      `}</style>

      {/* En-tête premium */}
      <div className="flex items-start justify-between gap-5 px-7 pb-4 pt-[26px]">
        <div className="flex items-center gap-3.5">
          <span
            className="flex size-[46px] items-center justify-center rounded-[14px] text-white"
            style={{ background: ACCENT_GRADIENT, boxShadow: "0 8px 18px -8px rgba(14,165,233,.55)" }}
          >
            <Calendar className="size-[22px]" />
          </span>
          <div>
            <h2 className="m-0 whitespace-nowrap text-xl font-extrabold tracking-[-0.02em] text-slate-900">
              Historique des rendez-vous
            </h2>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500">
              {counts.tous} consultation{counts.tous > 1 ? "s" : ""} · {counts.avenir} à venir
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={() => router.push("/dashboard/calendar")}
          whileHover={reduce ? undefined : { y: -1 }}
          whileTap={reduce ? undefined : { y: 0, scale: 0.98 }}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-[17px] py-[11px] text-sm font-semibold text-white"
          style={{ background: ACCENT, boxShadow: "0 10px 20px -10px rgba(14,165,233,.8)" }}
        >
          <Plus className="size-[17px]" strokeWidth={2.3} />
          Nouveau rendez-vous
        </motion.button>
      </div>

      {/* Onglets de filtre */}
      <div className="flex items-center gap-2 px-7 pb-4 pt-1">
        <div className="inline-flex gap-1 rounded-[14px] border border-slate-200 bg-slate-50 p-1">
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeFilter(tab.key)}
                aria-pressed={active}
                className={
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] px-[13px] py-[7px] text-[13px] transition-all " +
                  (active
                    ? "bg-white font-bold text-slate-900 shadow-sm"
                    : "bg-transparent font-semibold text-slate-500 hover:text-slate-700")
                }
              >
                {tab.label}
                <span
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-[5px] text-[11px] font-bold"
                  style={
                    active
                      ? { background: "#E0F2FE", color: ACCENT }
                      : { background: "#E7ECF3", color: "#94A3B8" }
                  }
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tableau */}
      {filtered.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className={HEADER_TH + " pl-7"}>Date &amp; heure</th>
                <th className={HEADER_TH}>Type de consultation</th>
                <th className={HEADER_TH}>Statut</th>
                <th className={HEADER_TH}>Praticien</th>
                <th className={HEADER_TH + " pr-7 text-right"}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((appt, i) => {
                const meta = STATUS_META[appt.status] ?? FALLBACK_STATUS;
                const { Icon, color } = typeVisual(appt.type);
                const isOpen = !!expanded[appt.id];
                const duration = formatDuration(appt.startTime, appt.endTime);

                return (
                  <React.Fragment key={appt.id}>
                    <motion.tr
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 9 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...rowTransition, delay: reduce ? 0 : i * 0.055 }}
                      onClick={() => toggle(appt.id)}
                      className="group cursor-pointer transition-colors hover:bg-sky-50/60 hover:[box-shadow:inset_3px_0_0_var(--rdv-accent)]"
                      style={{ ["--rdv-accent" as string]: ACCENT }}
                    >
                      {/* Date & heure */}
                      <td
                        className="whitespace-nowrap border-b border-slate-100 pl-7 pr-[18px] align-middle"
                        style={{ paddingTop: rowPad, paddingBottom: rowPad }}
                      >
                        <div className="text-sm font-bold tracking-[-0.01em] text-slate-900">
                          {formatDate(appt.startTime)}
                        </div>
                        <div className="mt-0.5 text-[12.5px] font-medium text-slate-500">
                          {formatTime(appt.startTime)}
                        </div>
                      </td>

                      {/* Type */}
                      <td
                        className="whitespace-nowrap border-b border-slate-100 px-[18px] align-middle"
                        style={{ paddingTop: rowPad, paddingBottom: rowPad }}
                      >
                        <div className="flex items-center gap-[11px]">
                          <span
                            className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px]"
                            style={{ background: color + "14", color }}
                          >
                            <Icon className="size-[18px]" strokeWidth={1.9} />
                          </span>
                          <span className="text-[13.5px] font-semibold text-slate-800">
                            {appt.type}
                          </span>
                        </div>
                      </td>

                      {/* Statut */}
                      <td
                        className="whitespace-nowrap border-b border-slate-100 px-[18px] align-middle"
                        style={{ paddingTop: rowPad, paddingBottom: rowPad }}
                      >
                        <StatusBadge meta={meta} reduce={reduce} />
                      </td>

                      {/* Praticien */}
                      <td
                        className="whitespace-nowrap border-b border-slate-100 px-[18px] align-middle"
                        style={{ paddingTop: rowPad, paddingBottom: rowPad }}
                      >
                        <div className="flex items-center gap-2.5">
                          {showAvatars && (
                            <span
                              className="flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold text-white"
                              style={{ background: ACCENT }}
                            >
                              {initials}
                            </span>
                          )}
                          <span className="text-[13.5px] font-semibold text-slate-700">
                            {practitionerName}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="whitespace-nowrap border-b border-slate-100 pl-[18px] pr-7 text-right align-middle"
                        style={{
                          paddingTop: `calc(${rowPad} - 4px)`,
                          paddingBottom: `calc(${rowPad} - 4px)`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(appt.id);
                          }}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? "Masquer" : "Voir"} les détails du rendez-vous du ${formatDate(appt.startTime)}`}
                          className="inline-flex items-center gap-1.5 rounded-[9px] px-[9px] py-[7px] text-[13.5px] font-bold transition-colors hover:bg-sky-50"
                          style={{ color: ACCENT }}
                        >
                          Voir les détails
                          <ChevronRight
                            className="size-[15px] transition-transform duration-200"
                            strokeWidth={2.4}
                            style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                          />
                        </button>
                      </td>
                    </motion.tr>

                    {/* Panneau de détails */}
                    <tr>
                      <td colSpan={5} className="p-0">
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: reduce ? 0.18 : 0.28, ease: EASE }}
                              style={{ overflow: "hidden", background: "#FCFDFF" }}
                            >
                              <div className="border-b border-slate-100 px-7 pb-5 pt-1.5">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[14px] border border-slate-100 bg-slate-50/70 px-5 py-[18px] sm:grid-cols-4">
                                  <DetailCell label="Motif" value={appt.motif ?? "—"} />
                                  <DetailCell label="Durée" value={duration ?? "—"} />
                                  <DetailCell label="Modalité" value={appt.modalite ?? "—"} />
                                  <DetailCell label="Lieu" value={appt.lieu ?? "—"} />
                                  {appt.note && (
                                    <div className="col-span-full mt-1 flex items-center gap-2.5 border-t border-dashed border-slate-200 pt-[13px] text-[13px] font-medium text-slate-600">
                                      <Info
                                        className="size-[15px] shrink-0"
                                        style={{ color: ACCENT }}
                                        strokeWidth={2}
                                      />
                                      {appt.note}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Lignes squelettes pendant le chargement */}
              {loading &&
                Array.from({ length: skeletonCount }).map((_, k) => (
                  <SkeletonRow key={`sk-${k}`} />
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Charger plus */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 border-t border-slate-100 bg-slate-50/60 p-4 text-[13.5px] font-bold transition-colors hover:bg-sky-50/60 disabled:cursor-default"
          style={{ color: ACCENT }}
        >
          {loading && <Loader2 className="size-[15px] animate-spin" />}
          {loading ? "Chargement…" : "Charger plus d'historique"}
        </button>
      )}
    </motion.section>
  );
}
