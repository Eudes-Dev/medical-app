"use client";

/**
 * Carte "Appointments" du dashboard avec data-table.
 *
 * - En-tête : titre "Appointments." + menu (ellipsis)
 * - Barre d'outils : recherche, sélecteur de période (Weekly), bouton Filter
 * - Tableau : Patient Name (avatar+nom), Date & Time, Treatment Types, Doctor Name (avatar+nom), Status (pill), Action (menu)
 */

import * as React from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  ChevronDown,
  Ellipsis,
  Filter,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AppointmentStatus = "confirmed" | "pending" | "cancelled";

export interface AppointmentRow {
  id: string;
  patientName: string;
  patientAvatarUrl?: string;
  dateTime: Date;
  treatmentType: string;
  doctorName: string;
  doctorAvatarUrl?: string;
  status: AppointmentStatus;
}

const defaultData: AppointmentRow[] = [
  {
    id: "1",
    patientName: "Tiana Delgado",
    dateTime: new Date(2025, 11, 15, 10, 0),
    treatmentType: "Preventive Care",
    doctorName: "Jakob Torff",
    status: "confirmed",
  },
];

function getStatusPillClass(status: AppointmentStatus): string {
  switch (status) {
    case "confirmed":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "cancelled":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function PersonCell({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="text-xs font-medium bg-muted">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium truncate">{name}</span>
    </div>
  );
}

const columns: ColumnDef<AppointmentRow>[] = [
  {
    accessorKey: "patientName",
    header: "Patient Name",
    cell: ({ row }) => (
      <PersonCell
        name={row.original.patientName}
        avatarUrl={row.original.patientAvatarUrl}
      />
    ),
  },
  {
    accessorKey: "dateTime",
    header: "Date & Time",
    cell: ({ row }) =>
      format(row.original.dateTime, "EEEE, d MMM yyyy - HH:mm", {
        locale: fr,
      }),
  },
  {
    accessorKey: "treatmentType",
    header: "Treatment Types",
    cell: ({ row }) => (
      <span className="truncate">{row.original.treatmentType}</span>
    ),
  },
  {
    accessorKey: "doctorName",
    header: "Doctor Name",
    cell: ({ row }) => (
      <PersonCell
        name={row.original.doctorName}
        avatarUrl={row.original.doctorAvatarUrl}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium",
          getStatusPillClass(row.original.status)
        )}
      >
        {getStatusLabel(row.original.status)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <span className="sr-only">Ouvrir le menu</span>
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/calendar?appointment=${appointment.id}`}>
                Voir le rendez-vous
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Modifier</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Annuler</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
  },
];

export interface AppointmentTableProps {
  title?: string;
  data?: AppointmentRow[];
}

export function AppointmentTable({
  title = "Appointments.",
  data = defaultData,
}: AppointmentTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: { columnFilters },
  });

  const searchColumn = table.getColumn("patientName");
  const searchValue = (searchColumn?.getFilterValue() as string) ?? "";

  return (
    <Card className="flex flex-col min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
        <CardTitle className="text-lg font-bold truncate">{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="shrink-0 size-8">
              <span className="sr-only">Options</span>
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Exporter</DropdownMenuItem>
            <DropdownMenuItem>Rafraîchir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {/* Barre d'outils : recherche, période, filtre */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search here..."
              value={searchValue}
              onChange={(e) =>
                searchColumn?.setFilterValue(e.target.value || undefined)
              }
              className="pl-9 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-2"
                >
                  <Calendar className="size-4" />
                  Weekly
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Daily</DropdownMenuItem>
                <DropdownMenuItem>Weekly</DropdownMenuItem>
                <DropdownMenuItem>Monthly</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-2"
                >
                  <Filter className="size-4" />
                  Filter
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Filtrer par</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Statut</DropdownMenuItem>
                <DropdownMenuItem>Date</DropdownMenuItem>
                <DropdownMenuItem>Médecin</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucun rendez-vous trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
