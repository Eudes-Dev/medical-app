/**
 * Utilitaires partagés pour l'application médicale.
 *
 * Ce fichier contient des fonctions utilitaires générales
 * utilisées dans toute l'application.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine et merge des classes CSS avec Tailwind.
 *
 * Cette fonction utilise `clsx` pour la combinaison conditionnelle
 * et `twMerge` pour résoudre les conflits de classes Tailwind.
 *
 * @param inputs - Classes CSS à combiner (strings, objets conditionnels, arrays)
 * @returns La chaîne de classes CSS combinée et optimisée
 *
 * @example
 * // Combinaison simple
 * cn("px-4 py-2", "bg-blue-500")
 * // => "px-4 py-2 bg-blue-500"
 *
 * @example
 * // Avec conditions
 * cn("base-class", isActive && "active-class", { "hover:bg-gray-100": isHoverable })
 * // => "base-class active-class hover:bg-gray-100" (si les conditions sont vraies)
 *
 * @example
 * // Résolution de conflits Tailwind
 * cn("px-4", "px-6")
 * // => "px-6" (la dernière valeur gagne)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
