/**
 * PatientTableSkeleton — fallback de chargement pour la table des patients
 * (story 2.1 initiale, étendue story 5.1 AC 2, 11 pour l'accessibilité).
 *
 * Affiche 10 lignes (= taille de page) avec `role="status"` + `aria-label`.
 *
 * NB rev 1.2 story 5.1 : demande de migrer vers Skeleton animate-ui ; ce
 * composant n'existe pas dans le registre animate-ui (vérifié). On conserve
 * le Skeleton Shadcn — divergence documentée en Completion Notes.
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

export function PatientTableSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement des patients"
      className="rounded-md border"
    >
      <span className="sr-only">Chargement en cours…</span>
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
