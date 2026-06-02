"use client";

/**
 * Formulaire d'édition du profil public du cabinet (story 7.4, AC 1/2/7/9).
 *
 * Saisie contrôlée + double validation Zod (`cabinetProfileSchema`) : feedback
 * inline côté client, revalidation serveur dans `updateCabinetProfile`. Suit le
 * pattern de `service-type-form` (7.3) : `useState` + `safeParse` + `useTransition`
 * + toasts `sonner`.
 *
 * @module components/settings/cabinet-profile-form
 */

import { useState, useTransition } from "react";

import {
  updateCabinetProfile,
  type CabinetProfileDTO,
} from "@/app/dashboard/settings/profile/actions";
import {
  cabinetProfileSchema,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_TAGLINE_MAX_LENGTH,
  PROFILE_DESCRIPTION_MAX_LENGTH,
  PROFILE_ADDRESS_MAX_LENGTH,
  PROFILE_ACCESS_INFO_MAX_LENGTH,
} from "@/lib/validations/cabinet-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

interface CabinetProfileFormProps {
  /** Profil existant à éditer ; `null` = table vide (premier déploiement). */
  initialProfile: CabinetProfileDTO | null;
}

export function CabinetProfileForm({ initialProfile }: CabinetProfileFormProps) {
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [tagline, setTagline] = useState(initialProfile?.tagline ?? "");
  const [description, setDescription] = useState(
    initialProfile?.description ?? "",
  );
  const [address, setAddress] = useState(initialProfile?.address ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [email, setEmail] = useState(initialProfile?.email ?? "");
  const [accessInfo, setAccessInfo] = useState(initialProfile?.accessInfo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload() {
    const opt = (v: string) => (v.trim() === "" ? undefined : v.trim());
    return {
      name,
      tagline: opt(tagline),
      description: opt(description),
      address,
      phone,
      email: opt(email),
      accessInfo: opt(accessInfo),
    };
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    const parsed = cabinetProfileSchema.safeParse(payload);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données invalides.";
      setError(message);
      showError(message);
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await updateCabinetProfile(parsed.data);
      if ("error" in result) {
        setError(result.error);
        showError(result.error);
        return;
      }
      showSuccess(TOAST_MESSAGES.cabinetProfile.saved);
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {/* Nom */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-name">Nom du cabinet</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Cabinet Médical Rive Gauche"
          maxLength={PROFILE_NAME_MAX_LENGTH}
          autoComplete="organization"
          required
        />
      </div>

      {/* Accroche */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-tagline">
          Accroche (optionnelle, max {PROFILE_TAGLINE_MAX_LENGTH})
        </Label>
        <Input
          id="profile-tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Ex. Médecine générale — sur rendez-vous"
          maxLength={PROFILE_TAGLINE_MAX_LENGTH}
        />
      </div>

      {/* Présentation */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-description">
          Présentation (optionnelle, max {PROFILE_DESCRIPTION_MAX_LENGTH})
        </Label>
        <Textarea
          id="profile-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Présentez votre cabinet, votre approche, votre équipe…"
          maxLength={PROFILE_DESCRIPTION_MAX_LENGTH}
          rows={4}
        />
      </div>

      {/* Adresse */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-address">Adresse</Label>
        <Input
          id="profile-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ex. 12 rue de la Santé, 75014 Paris"
          maxLength={PROFILE_ADDRESS_MAX_LENGTH}
          autoComplete="street-address"
          required
        />
      </div>

      {/* Téléphone */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-phone">Téléphone</Label>
        <Input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex. 01 23 45 67 89"
          autoComplete="tel"
          required
        />
      </div>

      {/* E-mail de contact */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-email">E-mail de contact (optionnel)</Label>
        <Input
          id="profile-email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ex. contact@cabinet.fr"
          autoComplete="email"
        />
      </div>

      {/* Infos d'accès */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-access">
          Accès & transports (optionnel, max {PROFILE_ACCESS_INFO_MAX_LENGTH})
        </Label>
        <Textarea
          id="profile-access"
          value={accessInfo}
          onChange={(e) => setAccessInfo(e.target.value)}
          placeholder="Métro ligne 6 station Glacière, parking à proximité…"
          maxLength={PROFILE_ACCESS_INFO_MAX_LENGTH}
          rows={3}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
