/**
 * Composant PatientTableSkeleton
 *
 * Affiche un skeleton de chargement pour la table des patients.
 * Utilisé pendant le chargement initial ou lors des changements de page/recherche.
 *
 * Ce composant utilise le composant Skeleton de Shadcn UI pour créer
 * un effet de chargement visuel.
 *
 * @module components/patients/patient-table-skeleton
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Composant PatientTableSkeleton.
 *
 * Affiche 10 lignes de skeleton (correspondant à la pagination de 10 résultats).
 *
 * @returns JSX du skeleton de la table
 */
export function PatientTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Afficher 10 lignes de skeleton (nombre de résultats par page) */}
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
