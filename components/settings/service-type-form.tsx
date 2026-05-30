"use client";

/**
 * Formulaire de création / édition d'un type de soin (story 7.3, AC 1/2/8/10).
 *
 * Saisie contrôlée + double validation Zod (`serviceTypeSchema`) : feedback
 * inline côté client, revalidation serveur dans les Server Actions. Réutilise
 * le pattern « pill segmented control » pour la durée (modal RDV) et le
 * `ColorPicker` a11y pour la couleur.
 *
 * @module components/settings/service-type-form
 */

import { useState, useTransition } from "react";

import {
  createServiceType,
  updateServiceType,
  type ServiceTypeDTO,
} from "@/app/dashboard/settings/services/actions";
import {
  serviceTypeSchema,
  SERVICE_DURATIONS,
  SERVICE_DESCRIPTION_MAX_LENGTH,
} from "@/lib/validations/service-type";
import type { ServiceColorId } from "@/lib/cabinet/service-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/settings/color-picker";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface ServiceTypeFormProps {
  /** Service à éditer ; absent = création. */
  service?: ServiceTypeDTO;
  onSaved: () => void;
  onCancel: () => void;
}

/** Libellés compacts des durées pour le pill segmented control. */
const DURATION_LABELS: Record<number, string> = {
  15: "15m",
  30: "30m",
  45: "45m",
  60: "1h",
  90: "1h30",
};

export function ServiceTypeForm({
  service,
  onSaved,
  onCancel,
}: ServiceTypeFormProps) {
  const isEdit = Boolean(service);
  const [label, setLabel] = useState(service?.label ?? "");
  const [durationMin, setDurationMin] = useState<number>(
    service?.durationMin ?? 30,
  );
  const [color, setColor] = useState<ServiceColorId>(
    (service?.color as ServiceColorId) ?? "emerald",
  );
  const [price, setPrice] = useState(
    service?.price != null ? String(service.price) : "",
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [isPublic, setIsPublic] = useState(service?.isPublic ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload() {
    const trimmedPrice = price.trim().replace(",", ".");
    return {
      label,
      durationMin,
      color,
      price: trimmedPrice === "" ? undefined : Number(trimmedPrice),
      description: description.trim() === "" ? undefined : description.trim(),
      isPublic,
      // `active` non éditable ici : préservé en édition, true à la création.
      // L'archivage/réactivation se fait depuis le gestionnaire (AC 6).
      active: service?.active ?? true,
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    const parsed = serviceTypeSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Données invalides.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result =
        isEdit && service
          ? await updateServiceType(service.id, payload)
          : await createServiceType(payload);

      if ("error" in result) {
        setError(result.error);
        showError(result.error);
        return;
      }
      showSuccess(
        isEdit ? TOAST_MESSAGES.serviceType.updated : TOAST_MESSAGES.serviceType.created,
      );
      onSaved();
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {/* Libellé */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="service-label">Libellé</Label>
        <Input
          id="service-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. Première consultation"
          maxLength={60}
          autoFocus
        />
      </div>

      {/* Durée — pill segmented control */}
      <div className="flex flex-col gap-2">
        <Label asChild>
          <span id="service-duration-label">Durée</span>
        </Label>
        <div
          role="radiogroup"
          aria-labelledby="service-duration-label"
          className="grid grid-cols-5 gap-1 rounded-full bg-muted/60 p-1"
        >
          {SERVICE_DURATIONS.map((d) => {
            const active = durationMin === d;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDurationMin(d)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-full text-sm font-medium transition-all",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {DURATION_LABELS[d]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Couleur */}
      <div className="flex flex-col gap-2">
        <Label asChild>
          <span id="service-color-label">Couleur</span>
        </Label>
        <ColorPicker
          value={color}
          onChange={(id) => setColor(id as ServiceColorId)}
          labelId="service-color-label"
          disabled={isPending}
        />
      </div>

      {/* Tarif */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="service-price">Tarif (€, optionnel)</Label>
        <Input
          id="service-price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ex. 50"
        />
      </div>

      {/* Description publique */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="service-description">
          Description publique (optionnelle, max {SERVICE_DESCRIPTION_MAX_LENGTH})
        </Label>
        <Textarea
          id="service-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Visible par les patients dans le tunnel de réservation."
          maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
          rows={3}
        />
      </div>

      {/* Visibilité publique */}
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <Label htmlFor="service-public" className="cursor-pointer">
            Visible en ligne
          </Label>
          <p className="text-xs text-muted-foreground">
            Proposé aux patients dans le tunnel de réservation public.
          </p>
        </div>
        <Switch
          id="service-public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement…"
            : isEdit
              ? "Enregistrer"
              : "Créer le type de soin"}
        </Button>
      </div>
    </form>
  );
}
