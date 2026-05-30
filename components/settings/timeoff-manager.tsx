"use client";

/**
 * Gestionnaire principal de la page Congés & jours fériés (story 7.2).
 *
 * Détient l'état des exceptions affichées, gère :
 * - le sélecteur d'année (recharge `getTimeOffs(year)`),
 * - le Dialog d'ajout (délégué à `TimeOffForm`),
 * - la liste des exceptions manuelles (suppression),
 * - la liste des jours fériés (`HolidayList`).
 *
 * Patterns repris de `ScheduleEditor` (7.1) : `useTransition` + toasts
 * centralisés, conservation des saisies sur erreur.
 *
 * @module components/settings/timeoff-manager
 */

import { useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import {
  deleteTimeOff,
  getTimeOffs,
  type TimeOffDTO,
} from "@/app/dashboard/settings/timeoff/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeOffForm } from "@/components/settings/timeoff-form";
import { HolidayList } from "@/components/settings/holiday-list";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface TimeOffManagerProps {
  initialYear: number;
  initialManual: TimeOffDTO[];
  initialHolidays: TimeOffDTO[];
}

/** Choix d'années offerts au praticien (année courante ± 1). */
function buildYearOptions(current: number): number[] {
  return [current - 1, current, current + 1];
}

function formatExceptionRange(t: TimeOffDTO): string {
  const start = parseISO(t.startDate);
  const end = parseISO(t.endDate);
  const startLabel = format(start, "EEE d MMM yyyy", { locale: fr });
  if (t.startDate === t.endDate) {
    if (t.allDay) return startLabel;
    return `${startLabel} · ${t.startTime}–${t.endTime}`;
  }
  return `${startLabel} → ${format(end, "EEE d MMM yyyy", { locale: fr })}`;
}

export function TimeOffManager({
  initialYear,
  initialManual,
  initialHolidays,
}: TimeOffManagerProps) {
  const [year, setYear] = useState(initialYear);
  const [manual, setManual] = useState(initialManual);
  const [holidays, setHolidays] = useState(initialHolidays);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isReloading, startReload] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const yearOptions = useMemo(() => buildYearOptions(initialYear), [initialYear]);

  const refreshFor = (nextYear: number) => {
    startReload(async () => {
      const data = await getTimeOffs(nextYear);
      setManual(data.manual);
      setHolidays(data.holidays);
    });
  };

  const handleYearChange = (value: string) => {
    const nextYear = Number(value);
    setYear(nextYear);
    refreshFor(nextYear);
  };

  const handleCreated = () => {
    setDialogOpen(false);
    refreshFor(year);
  };

  const handleDelete = (id: string) => {
    startDelete(async () => {
      const res = await deleteTimeOff(id);
      if ("error" in res) {
        showError(res.error);
        return;
      }
      setManual((prev) => prev.filter((m) => m.id !== id));
      showSuccess(TOAST_MESSAGES.timeOff.deleted);
    });
  };

  const handleHolidayChanged = (id: string, active: boolean) => {
    setHolidays((prev) =>
      prev.map((h) => (h.id === id ? { ...h, active } : h)),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Congés &amp; absences</CardTitle>
              <CardDescription>
                Bloquez une ou plusieurs journées, ou une plage horaire sur un
                jour donné. Les RDV existants ne sont jamais annulés sans votre
                confirmation explicite.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={isReloading}
            >
              <Plus className="size-4" /> Ajouter un congé
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {manual.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="Aucun congé enregistré"
              description="Ajoutez une exception pour bloquer une journée ou une plage horaire."
              action={
                <Button type="button" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-4" /> Ajouter un congé
                </Button>
              }
            />
          ) : (
            <ul
              className="divide-y rounded-md border"
              aria-label="Liste des congés et absences"
            >
              {manual.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatExceptionRange(t)}
                    </p>
                    {t.reason && (
                      <p className="text-xs text-muted-foreground">
                        {t.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Supprimer l'exception"
                    onClick={() => handleDelete(t.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="size-4 text-rose-600" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Jours fériés {year}</CardTitle>
              <CardDescription>
                Pré-remplis pour la France métropolitaine. Désactivez ceux qui
                ne s&apos;appliquent pas à votre cabinet — l&apos;état est
                conservé.
              </CardDescription>
            </div>
            <Select value={String(year)} onValueChange={handleYearChange}>
              <SelectTrigger className="w-32" aria-label="Année">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <HolidayList
            holidays={holidays}
            onChanged={handleHolidayChanged}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau congé / absence</DialogTitle>
            <DialogDescription>
              Renseignez la période à bloquer. Les RDV impactés seront listés
              à l&apos;étape suivante.
            </DialogDescription>
          </DialogHeader>
          <TimeOffForm
            onCreated={handleCreated}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
