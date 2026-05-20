/**
 * En-tête / carte d'identité publique du cabinet.
 *
 * Consomme `CABINET_INFO` (source unique). Affichée en haut de la landing
 * page `/[cabinet-slug]`.
 */

import { Card, CardContent } from "@/components/ui/card";
import { CABINET_INFO } from "@/lib/cabinet/config";
import { MapPin, Phone, Clock } from "lucide-react";

export function CabinetHeader() {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {CABINET_INFO.name}
          </h1>
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
              <dd>{CABINET_INFO.address}</dd>
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
                  href={`tel:${CABINET_INFO.phone.replace(/\s/g, "")}`}
                  className="hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {CABINET_INFO.phone}
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
              <dd>{CABINET_INFO.openingHoursLabel}</dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
