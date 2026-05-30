/**
 * Palette restreinte de couleurs pour les types de soins (story 7.3, AC 2/5/8).
 *
 * Module **pur** (aucune dépendance Prisma / serveur) afin d'être consommable
 * côté client (color-picker, modal RDV, carte calendrier) comme côté serveur
 * (validation Zod). Les jetons reprennent la palette déjà présente dans
 * l'application (`STATUS_STYLES` du calendrier, `TYPE_COLORS` du modal) et
 * complètent jusqu'à 8 teintes distinctes.
 *
 * Important (Tailwind v4) : toutes les classes utilitaires doivent apparaître
 * **littéralement** dans le code source pour être incluses au build. Elles sont
 * donc écrites en toutes lettres ci-dessous (pas de concaténation dynamique).
 *
 * @module lib/cabinet/service-colors
 */

/** Un jeton de couleur de service. */
export interface ServiceColor {
  /** Identifiant stable, persisté en base (`ServiceType.color`). */
  id: string;
  /** Libellé français (a11y : `aria-label` du sélecteur). */
  label: string;
  /** Classe de fond pleine pour la pastille (swatch / dot). */
  dot: string;
  /** Accent doux (chip / liseré) — fond teinté + texte lisible, dark-mode inclus. */
  accent: string;
}

/**
 * Les 8 couleurs de la palette. L'ordre est celui présenté dans le sélecteur.
 * `emerald` est la première (valeur par défaut suggérée, cohérente avec le
 * vert dominant de l'app).
 */
export const SERVICE_COLORS: readonly ServiceColor[] = [
  {
    id: "emerald",
    label: "Émeraude",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "blue",
    label: "Bleu",
    dot: "bg-blue-500",
    accent: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    id: "violet",
    label: "Violet",
    dot: "bg-violet-500",
    accent: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    id: "amber",
    label: "Ambre",
    dot: "bg-amber-500",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    id: "rose",
    label: "Rose",
    dot: "bg-rose-500",
    accent: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  {
    id: "teal",
    label: "Turquoise",
    dot: "bg-teal-500",
    accent: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  {
    id: "orange",
    label: "Orange",
    dot: "bg-orange-500",
    accent: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    id: "slate",
    label: "Ardoise",
    dot: "bg-slate-400",
    accent: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
] as const;

/** Identifiants de la palette (tuple typé pour `z.enum`). */
export const SERVICE_COLOR_IDS = [
  "emerald",
  "blue",
  "violet",
  "amber",
  "rose",
  "teal",
  "orange",
  "slate",
] as const;

export type ServiceColorId = (typeof SERVICE_COLOR_IDS)[number];

/** Jeton neutre de repli (couleur inconnue / RDV legacy sans service). */
const FALLBACK_COLOR: ServiceColor = SERVICE_COLORS[SERVICE_COLORS.length - 1]; // slate

/**
 * Résout un identifiant de couleur en jeton complet. Retombe sur `slate`
 * (neutre) si l'identifiant est inconnu ou absent — jamais d'exception.
 */
export function getServiceColor(id: string | null | undefined): ServiceColor {
  if (!id) return FALLBACK_COLOR;
  return SERVICE_COLORS.find((c) => c.id === id) ?? FALLBACK_COLOR;
}
