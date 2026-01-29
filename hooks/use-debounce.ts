/**
 * Hook useDebounce
 *
 * Retarde l'exécution d'une valeur jusqu'à ce qu'un délai spécifié
 * se soit écoulé sans nouvelle mise à jour.
 *
 * Utile pour éviter les requêtes excessives lors de la saisie dans un champ de recherche.
 *
 * @module hooks/use-debounce
 */

import { useEffect, useState } from "react";

/**
 * Hook personnalisé pour le debounce d'une valeur.
 *
 * @param value - Valeur à débouncer
 * @param delay - Délai en millisecondes (défaut: 300ms)
 * @returns Valeur débouncée (mise à jour après le délai)
 *
 * @example
 * ```typescript
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 300);
 *
 * // Utiliser debouncedSearch dans un useEffect pour déclencher la recherche
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     // Effectuer la recherche
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  // État pour stocker la valeur débouncée
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui mettra à jour la valeur débouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    // (annule le timer précédent et en crée un nouveau)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
