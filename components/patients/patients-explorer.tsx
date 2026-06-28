"use client";

/**
 * PatientsExplorer — expérience « Espace Patients » (refonte UI Claude Design).
 *
 * Recrée fidèlement le handoff « Refonte Espace Patients » pour la page liste :
 * - En-tête + 4 cartes de statistiques avec compteurs animés.
 * - Toolbar : recherche (debounce), bascule vue Table / Cartes, « Nouveau patient ».
 * - Table premium (avatar déterministe, badge actif, tri par nom, menu d'actions)
 *   et vue Cartes alternative, avec apparition en cascade (`motion`).
 * - États soignés : skeleton shimmer, vide, erreur, pagination serveur.
 *
 * Contrat préservé : consomme `getPatients` / `getPatientStats` / `deletePatient`
 * exactement comme l'existant. Les composants testés (`patient-data-table`,
 * `patients-table-wrapper`, `patient-table-skeleton`) ne sont pas modifiés.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  AlertTriangle,
  Calendar,
  Eye,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  CreatePatientModal,
  type CreatedPatient,
} from "@/components/patients/create-patient-modal";
import {
  getPatients,
  getPatientStats,
  deletePatient,
  type PatientStats,
  type PatientTableData,
} from "@/app/dashboard/patients/actions";

/* --------------------------------- Thème --------------------------------- */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Palette d'avatars déterministe (reprise du handoff). */
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

function initialsOf(p: PatientTableData): string {
  return ((p.firstName[0] ?? "") + (p.lastName[0] ?? "")).toUpperCase();
}

function avatarStyle(p: PatientTableData, size: number): React.CSSProperties {
  const c = AV[hueIdx(p.firstName + p.lastName)];
  return {
    width: size,
    height: size,
    borderRadius: size >= 46 ? 15 : "50%",
    background: `linear-gradient(135deg, ${c[0]}, ${c[1]})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: size >= 46 ? 17 : 14,
    flexShrink: 0,
    boxShadow: `0 6px 14px -6px ${c[1]}aa`,
  };
}

const LIMIT = 10;

/* ----------------------------- AnimatedCounter --------------------------- */

function AnimatedCounter({ value }: { value: number }) {
  const reduce = useReducedMotion() ?? false;
  const [display, setDisplay] = React.useState(reduce ? value : 0);
  const raf = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = 0;
    const dur = 1100;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (value - from) * e));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, reduce]);

  return <>{display}</>;
}

/* -------------------------------- StatCard ------------------------------- */

type StatCardProps = {
  index: number;
  label: string;
  value: number;
  caption: React.ReactNode;
  gradient: string;
  glow: string;
  icon: React.ReactNode;
  pulse?: boolean;
  reduce: boolean;
};

function StatCard({
  index,
  label,
  value,
  caption,
  gradient,
  glow,
  icon,
  pulse,
  reduce,
}: StatCardProps) {
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : index * 0.06 }}
      className="relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-[18px] pb-4"
      style={{
        boxShadow:
          "0 1px 2px rgba(15,23,42,.04), 0 16px 30px -24px rgba(15,23,42,.18)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-[18px] -top-[18px] h-[90px] w-[90px] rounded-full"
        style={{ background: glow }}
      />
      <div className="mb-3.5 flex items-center gap-2.5">
        <span
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] text-white"
          style={{ background: gradient }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-[34px] font-extrabold leading-none tracking-[-0.03em] text-slate-900">
        <AnimatedCounter value={value} />
        {pulse && (
          <span className="relative h-[9px] w-[9px]">
            <span className="absolute inset-0 rounded-full bg-emerald-500" />
            {!reduce && (
              <span
                className="absolute inset-0 rounded-full bg-emerald-500"
                style={{ animation: "pxPulse 2.4s infinite" }}
              />
            )}
          </span>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-500">{caption}</div>
    </motion.div>
  );
}

/* ------------------------------ StatusBadge ------------------------------ */

function ActiveBadge({ reduce }: { reduce: boolean }) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full bg-emerald-50 px-[11px] py-[5px] text-xs font-semibold text-emerald-700">
      <span className="relative h-[7px] w-[7px]">
        <span className="absolute inset-0 rounded-full bg-emerald-500" />
        {!reduce && (
          <span
            className="absolute inset-0 rounded-full bg-emerald-500"
            style={{ animation: "pxPulse 2.6s infinite" }}
          />
        )}
      </span>
      Actif
    </span>
  );
}

/* ------------------------------- ActionsMenu ----------------------------- */

function ActionsMenu({
  patient,
  open,
  onToggle,
  onView,
  onDelete,
  reduce,
}: {
  patient: PatientTableData;
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onView: () => void;
  onDelete: () => void;
  reduce: boolean;
}) {
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  return (
    <div
      data-menu="1"
      className="relative flex justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Actions pour ${patient.firstName} ${patient.lastName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-[9px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute right-0 top-[38px] z-20 w-[200px] rounded-[14px] border border-slate-200 bg-white p-1.5"
            style={{ boxShadow: "0 20px 44px -16px rgba(15,23,42,.3)" }}
          >
            {!confirming ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onView}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[13.5px] text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Eye size={16} /> Voir la fiche
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onView}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[13.5px] text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Pencil size={16} /> Modifier
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setConfirming(true)}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-left text-[13.5px] text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              </>
            ) : (
              <div className="px-2 py-1.5">
                <p className="px-1 pb-2 text-[12.5px] font-semibold text-slate-600">
                  Supprimer ce patient&nbsp;?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 rounded-[9px] border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex-1 rounded-[9px] bg-rose-600 px-2 py-1.5 text-[12.5px] font-bold text-white hover:bg-rose-700"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- PatientsExplorer -------------------------- */

export function PatientsExplorer() {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;

  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [data, setData] = React.useState<{
    patients: PatientTableData[];
    total: number;
  }>({ patients: [], total: 0 });
  const [stats, setStats] = React.useState<PatientStats | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const loadPatients = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await getPatients(
        page,
        LIMIT,
        debouncedSearch.trim() || undefined,
      );
      setData(result);
    } catch (err) {
      console.error("Erreur lors du chargement des patients:", err);
      setData({ patients: [], total: 0 });
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  const loadStats = React.useCallback(async () => {
    try {
      setStats(await getPatientStats());
    } catch (err) {
      console.error("Erreur lors du chargement des statistiques:", err);
    }
  }, []);

  React.useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fermeture du menu d'actions au clic extérieur.
  React.useEffect(() => {
    if (openMenuId == null) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-menu]")) setOpenMenuId(null);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [openMenuId]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));
  const start = data.total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(data.total, page * LIMIT);

  const sorted = React.useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...data.patients].sort(
      (a, b) => dir * a.lastName.localeCompare(b.lastName, "fr"),
    );
  }, [data.patients, sortDir]);

  const handleCreated = React.useCallback(
    (_patient: CreatedPatient) => {
      setPage(1);
      loadPatients();
      loadStats();
    },
    [loadPatients, loadStats],
  );

  const openDetail = React.useCallback(
    (id: string) => router.push(`/dashboard/patients/${id}`),
    [router],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      setOpenMenuId(null);
      try {
        const result = await deletePatient(id);
        if (!result.success) {
          showError(result.error || TOAST_MESSAGES.errors.server);
          return;
        }
        setData((prev) => ({
          patients: prev.patients.filter((p) => p.id !== id),
          total: Math.max(0, prev.total - 1),
        }));
        showSuccess(TOAST_MESSAGES.patient.deleted);
        loadStats();
        loadPatients();
      } catch (err) {
        console.error("[PatientsExplorer] delete error:", err);
        showError(TOAST_MESSAGES.errors.server);
      }
    },
    [loadPatients, loadStats],
  );

  const showSkeleton = loading && !error;
  const showEmpty = !loading && !error && data.patients.length === 0;
  const hasRows = !loading && !error && data.patients.length > 0;
  const searching = debouncedSearch.trim().length > 0;

  const segBtn = (active: boolean) =>
    cn(
      "flex h-[30px] w-[34px] items-center justify-center rounded-[9px] transition-all",
      active
        ? "bg-white text-sky-600 shadow-sm"
        : "bg-transparent text-slate-400 hover:text-slate-600",
    );

  return (
    <div>
      <style>{`
        @keyframes pxPulse { 0% { transform: scale(.7); opacity: .55 } 70% { transform: scale(2.6); opacity: 0 } 100% { opacity: 0 } }
        @keyframes pxShimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }
      `}</style>

      {/* En-tête */}
      <div className="mb-[22px]">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.03em] text-slate-900">
          Patients
        </h1>
        <p className="mt-1.5 text-[14.5px] text-slate-500">
          Gérez vos dossiers patients en toute sérénité.
        </p>
      </div>

      {/* Statistiques */}
      <div className="mb-[22px] grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          index={0}
          reduce={reduce}
          label="Total patients"
          value={stats?.total ?? 0}
          caption="Dossiers actifs au cabinet"
          gradient="linear-gradient(135deg,#0ea5e9,#38bdf8)"
          glow="radial-gradient(circle,rgba(14,165,233,.13),transparent 70%)"
          icon={<Users size={17} />}
        />
        <StatCard
          index={1}
          reduce={reduce}
          label="Nouveaux ce mois"
          value={stats?.newThisMonth ?? 0}
          caption={
            <span className="font-semibold text-emerald-600">
              Depuis le 1ᵉʳ du mois
            </span>
          }
          gradient="linear-gradient(135deg,#10b981,#14b8a6)"
          glow="radial-gradient(circle,rgba(16,185,129,.14),transparent 70%)"
          icon={<UserPlus size={17} />}
        />
        <StatCard
          index={2}
          reduce={reduce}
          label="Patients suivis"
          value={stats?.active ?? 0}
          caption="Avec rendez-vous"
          gradient="linear-gradient(135deg,#6366f1,#818cf8)"
          glow="radial-gradient(circle,rgba(99,102,241,.13),transparent 70%)"
          icon={<Zap size={17} />}
          pulse
        />
        <StatCard
          index={3}
          reduce={reduce}
          label="RDV à venir"
          value={stats?.upcomingAppointments ?? 0}
          caption="Confirmés ou en attente"
          gradient="linear-gradient(135deg,#f59e0b,#f97316)"
          glow="radial-gradient(circle,rgba(245,158,11,.14),transparent 70%)"
          icon={<Calendar size={17} />}
        />
      </div>

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-white p-[12px_14px]"
        style={{ boxShadow: "0 10px 30px -24px rgba(15,23,42,.25)" }}
      >
        <div className="relative min-w-[200px] max-w-[420px] flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un patient, email, téléphone…"
            aria-label="Rechercher un patient"
            className="w-full rounded-[13px] border border-slate-200/90 bg-slate-50 py-[11px] pl-[42px] pr-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,.16)]"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-[12px] border border-slate-200/90 bg-slate-100 p-[3px]">
            <button
              type="button"
              onClick={() => setView("table")}
              aria-label="Vue table"
              aria-pressed={view === "table"}
              className={segBtn(view === "table")}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              aria-label="Vue cartes"
              aria-pressed={view === "cards"}
              className={segBtn(view === "cards")}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <motion.button
            type="button"
            onClick={() => setCreateOpen(true)}
            whileHover={reduce ? undefined : { y: -1, scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="flex items-center gap-2 rounded-[13px] px-[17px] py-[11px] text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
              boxShadow: "0 10px 22px -10px rgba(14,165,233,.75)",
            }}
          >
            <UserPlus size={18} />
            Nouveau patient
          </motion.button>
        </div>
      </div>

      {/* Sheet de création (réutilise le contrat createPatient) */}
      <CreatePatientModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onPatientCreated={handleCreated}
      />

      {/* États */}
      {error && (
        <div
          className="mt-[18px] rounded-[24px] border border-rose-200/80 bg-white px-6 py-12 text-center"
          style={{ boxShadow: "0 16px 40px -28px rgba(15,23,42,.2)" }}
        >
          <div
            className="mx-auto mb-[18px] flex h-16 w-16 items-center justify-center rounded-[20px] text-white"
            style={{
              background: "linear-gradient(135deg,#fb7185,#f43f5e)",
              boxShadow: "0 14px 30px -12px rgba(244,63,94,.6)",
            }}
          >
            <AlertTriangle size={30} />
          </div>
          <h3 className="mb-1.5 text-lg font-bold text-slate-900">
            Impossible de charger les patients
          </h3>
          <p className="mx-auto mb-5 max-w-[360px] text-sm text-slate-500">
            Une erreur est survenue. Vérifiez votre connexion puis réessayez.
          </p>
          <button
            type="button"
            onClick={loadPatients}
            className="inline-flex items-center gap-2 rounded-[12px] bg-slate-900 px-5 py-[11px] text-sm font-bold text-white hover:bg-slate-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {showSkeleton && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Chargement des patients"
          className="mt-[18px] overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-[10px_10px_16px]"
          style={{ boxShadow: "0 16px 40px -28px rgba(15,23,42,.18)" }}
        >
          <span className="sr-only">Chargement en cours…</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 border-b border-slate-100 px-4 py-3.5 last:border-0"
            >
              <div className="px-shimmer h-[42px] w-[42px] rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="px-shimmer h-[11px] w-[42%] rounded-md" />
                <div className="px-shimmer h-[9px] w-[26%] rounded-md" />
              </div>
              <div className="px-shimmer h-6 w-[74px] rounded-full" />
            </div>
          ))}
          <style>{`.px-shimmer{background:linear-gradient(90deg,#eef2f7 25%,#e2e8f0 37%,#eef2f7 63%);background-size:300% 100%;animation:pxShimmer 1.4s infinite}`}</style>
        </div>
      )}

      {showEmpty && (
        <div
          className="mt-[18px] rounded-[24px] border border-slate-200/80 bg-white px-6 py-[54px] text-center"
          style={{ boxShadow: "0 16px 40px -28px rgba(15,23,42,.18)" }}
        >
          <div
            className="mx-auto mb-[18px] flex h-[72px] w-[72px] items-center justify-center rounded-[22px] text-sky-600"
            style={{ background: "linear-gradient(135deg,#e0f2fe,#cffafe)" }}
          >
            {searching ? <Search size={34} /> : <Users size={34} />}
          </div>
          <h3 className="mb-1.5 text-lg font-bold text-slate-900">
            {searching ? "Aucun résultat" : "Aucun patient"}
          </h3>
          <p className="mx-auto mb-5 max-w-[380px] text-sm text-slate-500">
            {searching
              ? `Aucun patient ne correspond à « ${debouncedSearch.trim()} ». Essayez un autre terme.`
              : "Commencez par ajouter votre premier dossier patient."}
          </p>
          {!searching && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-[12px] px-5 py-[11px] text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#06b6d4)" }}
            >
              <Plus size={17} /> Ajouter un patient
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {hasRows && view === "table" && (
        <div
          className="mt-[18px] overflow-hidden rounded-[24px] border border-slate-200/80 bg-white"
          style={{ boxShadow: "0 16px 44px -30px rgba(15,23,42,.22)" }}
        >
          <div className="grid grid-cols-[2.4fr_1.4fr_1fr_54px] gap-3 border-b border-slate-100 bg-slate-50/60 px-[22px] py-[13px] md:grid-cols-[2.4fr_1.6fr_1fr_54px]">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500"
            >
              Patient
              <span
                className="inline-flex transition-transform"
                style={{
                  transform: sortDir === "desc" ? "rotate(180deg)" : "none",
                  color: "#0284c7",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </span>
            </button>
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
              Contact
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-400">
              Statut
            </span>
            <span />
          </div>

          {sorted.map((p, i) => (
            <motion.div
              key={p.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                ease: EASE,
                delay: reduce ? 0 : i * 0.042,
              }}
              onClick={() => openDetail(p.id)}
              className="grid cursor-pointer grid-cols-[2.4fr_1.4fr_1fr_54px] items-center gap-3 border-b border-slate-100 px-[22px] py-[13px] transition-colors last:border-0 hover:bg-sky-50/40 hover:[box-shadow:inset_3px_0_0_#38bdf8] md:grid-cols-[2.4fr_1.6fr_1fr_54px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div style={avatarStyle(p, 42)}>{initialsOf(p)}</div>
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-bold text-slate-900">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="truncate text-[12.5px] text-slate-400">
                    {p.email || "—"}
                  </div>
                </div>
              </div>
              <div className="truncate whitespace-nowrap text-[13.5px] tabular-nums text-slate-600">
                {p.phone}
              </div>
              <div>
                <ActiveBadge reduce={reduce} />
              </div>
              <ActionsMenu
                patient={p}
                open={openMenuId === p.id}
                reduce={reduce}
                onToggle={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((cur) => (cur === p.id ? null : p.id));
                }}
                onView={() => openDetail(p.id)}
                onDelete={() => handleDelete(p.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Cartes */}
      {hasRows && view === "cards" && (
        <div className="mt-[18px] grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p, i) => (
            <motion.div
              key={p.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                ease: EASE,
                delay: reduce ? 0 : i * 0.05,
              }}
              whileHover={reduce ? undefined : { y: -3 }}
              onClick={() => openDetail(p.id)}
              className="cursor-pointer rounded-[20px] border border-slate-200/80 bg-white p-[18px] transition-shadow hover:border-sky-300"
              style={{ boxShadow: "0 12px 30px -24px rgba(15,23,42,.25)" }}
            >
              <div className="mb-3.5 flex items-center gap-3">
                <div style={avatarStyle(p, 48)}>{initialsOf(p)}</div>
                <div className="min-w-0">
                  <div className="truncate text-[15.5px] font-bold text-slate-900">
                    {p.firstName} {p.lastName}
                  </div>
                  <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Actif
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[13px] text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Mail size={15} className="text-slate-400" />
                  <span className="truncate">{p.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={15} className="text-slate-400" />
                  {p.phone}
                </div>
              </div>
              <div className="mt-[15px] flex items-center justify-between border-t border-slate-100 pt-[13px]">
                <span className="text-xs text-slate-400">Voir le dossier</span>
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-sky-600">
                  Ouvrir
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasRows && (
        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] tabular-nums text-slate-500">
            {data.total === 0
              ? "0 patient"
              : `${start}–${end} sur ${data.total} patient${data.total > 1 ? "s" : ""}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 rounded-[11px] border border-slate-200/90 bg-white px-[13px] py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
              Précédent
            </button>
            <span className="px-1.5 text-[13px] font-bold tabular-nums text-slate-900">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 rounded-[11px] border border-slate-200/90 bg-white px-[13px] py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-300"
            >
              Suivant
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
