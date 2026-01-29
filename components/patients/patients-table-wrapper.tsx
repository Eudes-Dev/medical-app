"use client";

/**
 * Composant PatientsTableWrapper
 *
 * Wrapper client pour la table des patients qui gère:
 * - L'état de la recherche avec debounce
 * - L'état de la pagination
 * - Les appels à la Server Action getPatients
 * - L'affichage du skeleton pendant le chargement
 *
 * Ce composant est un Client Component car il utilise des hooks React
 * (useState, useEffect) et gère l'état interactif.
 *
 * @module components/patients/patients-table-wrapper
 */

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PatientDataTable } from "@/components/patients/patient-data-table";
import { PatientTableSkeleton } from "@/components/patients/patient-table-skeleton";
import { getPatients, type PatientTableData } from "@/app/dashboard/patients/actions";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * Composant PatientsTableWrapper.
 *
 * Gère l'état de la recherche et de la pagination, et charge les données
 * depuis la Server Action getPatients.
 *
 * @returns JSX du wrapper avec la table des patients
 */
export function PatientsTableWrapper() {
  // État de la recherche (valeur saisie dans le champ)
  const [search, setSearch] = React.useState<string>("");
  
  // Valeur de recherche débouncée (mise à jour après 300ms d'inactivité)
  const debouncedSearch = useDebounce(search, 300);

  // État de la pagination (page courante, commence à 1)
  const [page, setPage] = React.useState<number>(1);

  // État de chargement
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // État des données des patients
  const [data, setData] = React.useState<{
    patients: PatientTableData[];
    total: number;
  }>({
    patients: [],
    total: 0,
  });

  // Constante pour le nombre de résultats par page
  const limit = 10;

  // Fonction pour charger les patients depuis la Server Action
  const loadPatients = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Appeler la Server Action avec la page courante et la recherche débouncée
      const result = await getPatients(
        page,
        limit,
        debouncedSearch.trim() || undefined // Passer undefined si la recherche est vide
      );
      setData(result);
    } catch (error) {
      console.error("Erreur lors du chargement des patients:", error);
      // En cas d'erreur, réinitialiser les données
      setData({ patients: [], total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, limit]);

  // Charger les patients quand la page ou la recherche change
  React.useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Réinitialiser à la page 1 quand la recherche change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      {/* Champ de recherche */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, prénom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table des patients ou skeleton de chargement */}
      {isLoading ? (
        <PatientTableSkeleton />
      ) : (
        <PatientDataTable
          patients={data.patients}
          total={data.total}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}
    </div>
  );
}
