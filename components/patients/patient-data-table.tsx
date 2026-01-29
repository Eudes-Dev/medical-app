"use client";

/**
 * Composant PatientDataTable
 *
 * Table interactive de patients avec:
 * - Colonnes: Nom, Prénom, Email, Téléphone, Actions
 * - Recherche avec debounce (sera implémentée dans Task 5)
 * - Pagination (sera implémentée dans Task 6)
 * - Navigation vers la fiche patient (sera implémentée dans Task 7)
 *
 * Ce composant utilise @tanstack/react-table pour la gestion de la table
 * et les composants Shadcn UI pour le style.
 *
 * @module components/patients/patient-data-table
 */

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PatientTableData } from "@/app/dashboard/patients/actions";

/**
 * Type des colonnes de la table.
 * Définit la structure des colonnes avec leurs en-têtes et cellules.
 */
const columns: ColumnDef<PatientTableData>[] = [
  {
    // Colonne: Nom de famille
    accessorKey: "lastName",
    header: "Nom",
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("lastName")}</div>;
    },
  },
  {
    // Colonne: Prénom
    accessorKey: "firstName",
    header: "Prénom",
    cell: ({ row }) => {
      return <div>{row.getValue("firstName")}</div>;
    },
  },
  {
    // Colonne: Email (peut être null)
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue<string | null>("email");
      return <div>{email || <span className="text-muted-foreground">—</span>}</div>;
    },
  },
  {
    // Colonne: Téléphone
    accessorKey: "phone",
    header: "Téléphone",
    cell: ({ row }) => {
      return <div>{row.getValue("phone")}</div>;
    },
  },
  {
    // Colonne: Actions (bouton "Voir" pour naviguer vers la fiche patient)
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const patientId = row.original.id;
      return (
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/patients/${patientId}`}>Voir</Link>
        </Button>
      );
    },
  },
];

/**
 * Props du composant PatientDataTable.
 */
type PatientDataTableProps = {
  /** Liste des patients à afficher */
  patients: PatientTableData[];
  /** Nombre total de patients (pour la pagination) */
  total: number;
  /** Fonction de callback appelée quand la page change */
  onPageChange?: (page: number) => void;
  /** Fonction de callback appelée quand la recherche change */
  onSearchChange?: (search: string) => void;
};

/**
 * Composant PatientDataTable.
 *
 * Affiche une table interactive de patients avec pagination et recherche.
 * Utilise @tanstack/react-table pour la gestion de l'état de la table.
 *
 * @param props - Props du composant
 * @returns JSX de la table des patients
 */
export function PatientDataTable({
  patients,
  total,
  onPageChange,
  onSearchChange,
}: PatientDataTableProps) {
  // État de pagination géré par react-table
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0, // Index de la page (commence à 0)
    pageSize: 10, // Nombre de résultats par page
  });

  // Créer l'instance de la table avec react-table
  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(), // Modèle de base pour les lignes
    getPaginationRowModel: getPaginationRowModel(), // Modèle de pagination
    manualPagination: true, // La pagination est gérée côté serveur
    pageCount: Math.ceil(total / pagination.pageSize), // Nombre total de pages
    state: {
      pagination,
    },
    onPaginationChange: (updater) => {
      // Mettre à jour l'état de pagination
      const newPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(newPagination);

      // Appeler le callback pour notifier le changement de page
      // (convertir l'index de page en numéro de page: pageIndex 0 = page 1)
      if (onPageChange) {
        onPageChange(newPagination.pageIndex + 1);
      }
    },
  });

  return (
    <div className="space-y-4">
      {/* Table des patients */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : // Utiliser flexRender pour rendre l'en-tête de la colonne
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              // Afficher les lignes de la table
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {/* Utiliser flexRender pour rendre la cellule avec la fonction cell définie dans les colonnes */}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Aucun résultat
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Aucun patient trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Contrôles de pagination */}
      <div className="flex items-center justify-between">
        {/* Informations sur la pagination */}
        <div className="text-sm text-muted-foreground">
          Affichage de {pagination.pageIndex * pagination.pageSize + 1} à{" "}
          {Math.min(
            (pagination.pageIndex + 1) * pagination.pageSize,
            total
          )}{" "}
          sur {total} patient{total > 1 ? "s" : ""}
        </div>

        {/* Boutons de navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
