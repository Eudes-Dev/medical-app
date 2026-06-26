"use client";

/**
 * Primitives UI partagées par les sections du dossier patient (épopée 9).
 *
 * Centralise le langage visuel « Fidèle » du handoff Claude Design « Dossier
 * Patient » : palette (bleu médical sky/cyan + accents par catégorie), coque de
 * section premium, textarea auto-resize avec focus ring animé, et le petit hook
 * de « flash » qui surligne brièvement une carte après ajout/mise à jour.
 *
 * Aucune logique métier ici — uniquement de la présentation réutilisable, afin
 * que les trois sections (Antécédents, Notes, Documents) restent cohérentes.
 */

import * as React from "react";
import { motion } from "motion/react";

/* --------------------------------- Thème --------------------------------- */

/** Accent principal (sky-500). */
export const ACCENT = "#0ea5e9";
/** Accent secondaire (cyan-500). */
export const ACCENT2 = "#06b6d4";
/** Teinte d'accent douce (sky-100), utilisée pour le flash de surlignage. */
export const ACCENT_SOFT = "#e0f2fe";
/** Dégradé d'accent réutilisable (pastilles, boutons primaires). */
export const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`;
/** Anneau de focus accent (cohérent sur tous les champs). */
export const RING = "0 0 0 3px rgba(14,165,233,.18)";
/** Ombre des pastilles d'accent. */
export const PASTILLE_SHADOW = "0 8px 18px -8px rgba(14,165,233,.55)";
/** Ombre des cartes de section. */
export const SECTION_SHADOW =
  "0 1px 2px rgba(15,23,42,.04), 0 10px 30px -16px rgba(15,23,42,.16)";
/** Courbe d'animation commune (ease-out doux). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* -------------------------------- Helpers -------------------------------- */

/**
 * Couleur du compteur de caractères selon la proximité de la limite :
 * slate par défaut, amber dès 85 %, rose à 100 %.
 */
export function counterColor(len: number, max: number): string {
  const ratio = len / max;
  if (ratio >= 1) return "#e11d48";
  if (ratio >= 0.85) return "#d97706";
  return "#94a3b8";
}

/** Formate une taille en octets en o / Ko / Mo lisibles (format FR). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1048576).toFixed(1).replace(".", ",")} Mo`;
}

/**
 * Hook de surlignage temporaire : `flash(id)` ajoute l'id à l'ensemble surligné
 * puis le retire au bout d'une seconde (highlight `sky-50` qui s'estompe).
 */
export function useFlash() {
  const [flashed, setFlashed] = React.useState<Set<string>>(new Set());
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const flash = React.useCallback((id: string) => {
    setFlashed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    timers.current.set(
      id,
      setTimeout(() => {
        setFlashed((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timers.current.delete(id);
      }, 1000),
    );
  }, []);

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return { flashed, flash };
}

/* ------------------------------ SectionShell ----------------------------- */

export type SectionShellProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
  /** Label de capture d'écran (parité avec le mockup `data-screen-label`). */
  screenLabel?: string;
};

/**
 * Coque de section premium : carte arrondie, en-tête avec pastille dégradée +
 * titre/sous-titre + badge compteur, puis le contenu en padding généreux.
 */
export function SectionShell({
  icon,
  title,
  subtitle,
  badge,
  children,
  screenLabel,
}: SectionShellProps) {
  return (
    <section
      data-screen-label={screenLabel ?? title}
      className="w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white"
      style={{ boxShadow: SECTION_SHADOW }}
    >
      <div className="flex items-center gap-3.5 border-b border-slate-200 px-6 py-5">
        <span
          className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] text-white"
          style={{ background: ACCENT_GRADIENT, boxShadow: PASTILLE_SHADOW }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.01em] text-slate-900">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
        </div>
        <CountBadge>{badge}</CountBadge>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/** Badge compteur discret (pilule slate). */
export function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
      {children}
    </span>
  );
}

/* ------------------------------ AutoTextarea ----------------------------- */

type AutoTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "style"
> & {
  /** Hauteur minimale en pixels. */
  minHeight?: number;
  /** Mode édition inline : bordure accent + anneau permanents. */
  editing?: boolean;
};

/**
 * Textarea auto-resize (CSS `field-sizing: content`, fallback JS) avec anneau de
 * focus accent animé. Utilisée par les composers et les éditeurs inline.
 */
export function AutoTextarea({
  minHeight = 80,
  editing = false,
  onFocus,
  onBlur,
  ...props
}: AutoTextareaProps) {
  const [focused, setFocused] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  // Fallback auto-resize pour les navigateurs sans `field-sizing`.
  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  React.useEffect(() => {
    resize();
  }, [resize, props.value]);

  const active = focused || editing;

  return (
    <textarea
      {...props}
      ref={ref}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onInput={resize}
      className="w-full resize-none rounded-[14px] px-3.5 py-3 text-sm leading-[1.5] text-slate-900 outline-none transition-shadow placeholder:text-slate-400 disabled:opacity-60"
      style={{
        minHeight,
        maxHeight: 240,
        // `field-sizing` n'est pas encore typé dans React/TS.
        fieldSizing: "content",
        border: `1px solid ${active ? ACCENT : "#e2e8f0"}`,
        boxShadow: active ? RING : "none",
        background: "#fff",
      } as React.CSSProperties}
    />
  );
}

/* ------------------------------ IconButton ------------------------------- */

/** Bouton icône d'action de carte ; couleur au survol selon la variante. */
export function IconButton({
  label,
  onClick,
  disabled,
  variant,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "edit" | "delete" | "neutral";
  children: React.ReactNode;
}) {
  const hover =
    variant === "edit"
      ? "hover:bg-slate-100 hover:text-sky-500 focus-visible:bg-slate-100"
      : variant === "delete"
        ? "hover:bg-rose-50 hover:text-rose-600 focus-visible:bg-rose-50"
        : "hover:bg-slate-100 focus-visible:bg-slate-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={
        "inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-transparent text-slate-500 transition-colors disabled:opacity-60 " +
        hover
      }
    >
      {children}
    </button>
  );
}

/* ----------------------------- DeleteConfirm ----------------------------- */

/** Mini-bloc de confirmation de suppression inline animé (expand/collapse). */
export function DeleteConfirm({
  question,
  onConfirm,
  onCancel,
  disabled,
}: {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 11 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      style={{ overflow: "hidden" }}
    >
      <div className="flex flex-wrap items-center gap-2.5 rounded-[11px] border border-rose-200 bg-rose-50 px-3 py-2.5">
        <span className="flex-1 text-[13px] font-semibold text-rose-700">
          {question}
        </span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-[9px] bg-rose-600 px-[13px] py-[7px] text-[13px] font-bold text-white disabled:opacity-60"
        >
          Supprimer
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-[9px] border border-rose-200 bg-white px-[13px] py-[7px] text-[13px] font-semibold text-rose-700"
        >
          Annuler
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Pilule (chip) ---------------------------- */

export type ChipStyle = {
  color: string;
  soft: string;
  border: string;
};

/**
 * Pilule de sélection de catégorie : pleine et teintée si sélectionnée, contour
 * léger sinon. Micro-élévation au survol.
 */
export function CategoryChip({
  selected,
  style,
  label,
  icon,
  small,
  onSelect,
  disabled,
}: {
  selected: boolean;
  style: ChipStyle;
  label: string;
  icon?: React.ReactNode;
  small?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      whileHover={disabled ? undefined : { y: -1 }}
      className={
        "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-60 " +
        (small ? "px-[11px] py-1.5 text-xs" : "px-3 py-[7px] text-[13px]")
      }
      style={{
        border: `1px solid ${selected ? style.color : style.border}`,
        background: selected ? style.color : "#fff",
        color: selected ? "#fff" : style.color,
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}
