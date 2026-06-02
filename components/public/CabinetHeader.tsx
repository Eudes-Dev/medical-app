/**
 * En-tête / carte d'identité publique du cabinet.
 *
 * Reçoit le profil **persisté** en props (story 7.4) — plus aucune dépendance à
 * `CABINET_INFO`. Le libellé d'horaires est dérivé des `WorkingHours` (hand-off
 * 7.1) côté serveur et passé en prop. Affichée sur la landing `/[cabinet-slug]`.
 */

import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Clock, Mail } from "lucide-react";

export interface CabinetHeaderProps {
  name: string;
  address: string;
  phone: string;
  email?: string | null;
  /** Libellé d'horaires dérivé des `WorkingHours` (story 7.4). */
  openingHoursLabel: string;
}

export function CabinetHeader({
  name,
  address,
  phone,
  email,
  openingHoursLabel,
}: CabinetHeaderProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {name}
          </h2>
          <p className="mt-2 text-slate-600">
            Bienvenue. Réservez votre consultation en ligne, sans création
            de compte.
          </p>
        </div>
        <dl className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="flex items-start gap-2">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
              aria-hidden
            />
            <div>
              <dt className="font-medium">Adresse</dt>
              <dd>{address}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
              aria-hidden
            />
            <div>
              <dt className="font-medium">Téléphone</dt>
              <dd>
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {phone}
                </a>
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
              aria-hidden
            />
            <div>
              <dt className="font-medium">Horaires</dt>
              <dd>{openingHoursLabel}</dd>
            </div>
          </div>
          {email && (
            <div className="flex items-start gap-2">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                aria-hidden
              />
              <div>
                <dt className="font-medium">E-mail</dt>
                <dd>
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {email}
                  </a>
                </dd>
              </div>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
