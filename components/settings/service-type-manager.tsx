"use client";

/**
 * Gestionnaire de la page Types de soins (story 7.3, AC 1/2/6/10).
 *
 * Détient l'état de la liste, gère :
 * - le Dialog d'ajout / édition (délégué à `ServiceTypeForm`),
 * - les sections « Actifs » / « Archivés »,
 * - l'archivage / réactivation (`toggleServiceTypeActive`),
 * - la suppression protégée : si des RDV sont rattachés, on propose l'archivage
 *   au lieu de supprimer (AC 6).
 *
 * Patterns repris de `TimeOffManager` (7.2) : `useTransition` + toasts
 * centralisés, mise à jour optimiste rechargée depuis le serveur.
 *
 * @module components/settings/service-type-manager
 */

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Stethoscope, Trash2 } from "lucide-react";

import {
  deleteServiceType,
  getServiceTypes,
  toggleServiceTypeActive,
  type ServiceTypeDTO,
} from "@/app/dashboard/settings/services/actions";
import { Badge } from "@/components/ui/badge";
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
import { ServiceTypeForm } from "@/components/settings/service-type-form";
import { getServiceColor } from "@/lib/cabinet/service-colors";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface ServiceTypeManagerProps {
  initialServices: ServiceTypeDTO[];
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest}`;
}

export function ServiceTypeManager({
  initialServices,
}: ServiceTypeManagerProps) {
  const [services, setServices] = useState(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTypeDTO | null>(null);
  const [isMutating, startMutation] = useTransition();

  const active = services.filter((s) => s.active);
  const archived = services.filter((s) => !s.active);

  const refresh = () => {
    startMutation(async () => {
      const data = await getServiceTypes();
      setServices(data);
    });
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditing(null);
    refresh();
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (service: ServiceTypeDTO) => {
    setEditing(service);
    setDialogOpen(true);
  };

  const handleToggleActive = (service: ServiceTypeDTO) => {
    startMutation(async () => {
      const res = await toggleServiceTypeActive(service.id, !service.active);
      if ("error" in res) {
        showError(res.error);
        return;
      }
      showSuccess(
        service.active
          ? TOAST_MESSAGES.serviceType.archived
          : TOAST_MESSAGES.serviceType.restored,
      );
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, active: !service.active } : s,
        ),
      );
    });
  };

  const handleDelete = (service: ServiceTypeDTO) => {
    startMutation(async () => {
      const res = await deleteServiceType(service.id);
      if ("error" in res) {
        // AC 6 : suppression refusée car des RDV sont rattachés → on propose
        // l'archivage (message dédié) plutôt qu'une suppression destructive.
        if (res.error === "HAS_APPOINTMENTS") {
          showError(TOAST_MESSAGES.serviceType.hasAppointments);
        } else {
          showError(res.error);
        }
        return;
      }
      showSuccess(TOAST_MESSAGES.serviceType.deleted);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Types de soins</CardTitle>
              <CardDescription>
                Définissez vos motifs de consultation : durée, couleur, tarif et
                visibilité en ligne. Les soins « visibles en ligne » sont
                proposés aux patients dans le tunnel de réservation.
              </CardDescription>
            </div>
            <Button type="button" onClick={openCreate} disabled={isMutating}>
              <Plus className="size-4" /> Ajouter un type de soin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="Aucun type de soin"
              description="Ajoutez un type de soin pour définir la durée et le tarif de vos consultations."
              action={
                <Button type="button" onClick={openCreate}>
                  <Plus className="size-4" /> Ajouter un type de soin
                </Button>
              }
            />
          ) : (
            <ul
              className="divide-y rounded-md border"
              aria-label="Types de soins actifs"
            >
              {active.map((s) => (
                <ServiceRow
                  key={s.id}
                  service={s}
                  disabled={isMutating}
                  onEdit={() => openEdit(s)}
                  onToggleActive={() => handleToggleActive(s)}
                  onDelete={() => handleDelete(s)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {archived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Archivés</CardTitle>
            <CardDescription>
              Ces types de soins ne sont plus proposés mais conservent
              l&apos;historique des rendez-vous. Réactivez-les à tout moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul
              className="divide-y rounded-md border"
              aria-label="Types de soins archivés"
            >
              {archived.map((s) => (
                <ServiceRow
                  key={s.id}
                  service={s}
                  disabled={isMutating}
                  onEdit={() => openEdit(s)}
                  onToggleActive={() => handleToggleActive(s)}
                  onDelete={() => handleDelete(s)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le type de soin" : "Nouveau type de soin"}
            </DialogTitle>
            <DialogDescription>
              Renseignez le libellé, la durée et les options de visibilité.
            </DialogDescription>
          </DialogHeader>
          <ServiceTypeForm
            // Remonte le formulaire à chaque changement de cible (create/edit).
            key={editing?.id ?? "new"}
            service={editing ?? undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ServiceRow({
  service,
  disabled,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  service: ServiceTypeDTO;
  disabled: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const color = getServiceColor(service.color);
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn("size-3 shrink-0 rounded-full", color.dot)}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{service.label}</p>
            <Badge variant={service.isPublic ? "secondary" : "outline"}>
              {service.isPublic ? "En ligne" : "Privé"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDuration(service.durationMin)}
            {service.price != null && (
              <> · {priceFormatter.format(service.price)}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Modifier ${service.label}`}
          onClick={onEdit}
          disabled={disabled}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            service.active
              ? `Archiver ${service.label}`
              : `Réactiver ${service.label}`
          }
          onClick={onToggleActive}
          disabled={disabled}
        >
          {service.active ? (
            <Archive className="size-4" />
          ) : (
            <ArchiveRestore className="size-4 text-emerald-600" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Supprimer ${service.label}`}
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="size-4 text-rose-600" />
        </Button>
      </div>
    </li>
  );
}
