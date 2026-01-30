"use client";

/**
 * PatientSelect - Sélection de patient avec recherche (Story 3.3 - Task 2).
 *
 * Comportement type Combobox:
 * - Champ de recherche par nom / email (getPatients avec search)
 * - Liste déroulante des patients correspondants
 * - Bouton "Nouveau patient" qui ouvre CreatePatientModal, puis rafraîchit la liste
 *   et pré-sélectionne le patient créé
 *
 * Utilisé dans CreateAppointmentModal pour choisir le patient du rendez-vous.
 */

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreatePatientModal,
  type CreatedPatient,
} from "@/components/patients/create-patient-modal";
import {
  getPatients,
  getPatientById,
  type PatientTableData,
} from "@/app/dashboard/patients/actions";
import { cn } from "@/lib/utils";

/** Délai en ms avant d'appeler getPatients après une frappe (éviter trop de requêtes) */
const SEARCH_DEBOUNCE_MS = 300;

export interface PatientSelectProps {
  /** Valeur sélectionnée (id du patient) */
  value: string;
  /** Callback quand la sélection change */
  onChange: (patientId: string, patient: PatientTableData | null) => void;
  /** Message d'erreur (ex: validation formulaire) */
  error?: string;
  /** Désactiver le champ */
  disabled?: boolean;
  /** Id du champ pour l'accessibilité */
  id?: string;
}

/**
 * Réduit un patient en libellé d'affichage (prénom + nom, ou email si pas de nom).
 */
function patientLabel(p: PatientTableData): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  if (name) return name;
  return p.email ?? p.phone ?? p.id;
}

/**
 * PatientSelect: champ de sélection avec recherche et création de patient.
 */
export function PatientSelect({
  value,
  onChange,
  error,
  disabled,
  id: propId,
}: PatientSelectProps) {
  const generatedId = React.useId();
  const inputId = propId ?? generatedId;

  const [search, setSearch] = useState("");
  const [list, setList] = useState<PatientTableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger le libellé du patient sélectionné au montage / quand value change
  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const inList = list.find((p) => p.id === value);
    if (inList) {
      setSelectedLabel(patientLabel(inList));
      return;
    }
    // Sinon charger le patient par ID pour afficher son nom (ex: pré-sélection après création)
    getPatientById(value).then((patient) => {
      if (patient) {
        setSelectedLabel(`${patient.firstName} ${patient.lastName}`.trim() || patient.phone);
      } else {
        setSelectedLabel(value);
      }
    });
  }, [value, list]);

  // Recherche avec debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      getPatients(1, 50, search || undefined)
        .then(({ patients }) => setList(patients))
        .finally(() => setLoading(false));
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open]);

  const handleSelect = useCallback(
    (p: PatientTableData) => {
      onChange(p.id, p);
      setSelectedLabel(patientLabel(p));
      setSearch("");
      setOpen(false);
    },
    [onChange]
  );

  const handlePatientCreated = useCallback(
    (patient: CreatedPatient) => {
      // Rafraîchir la liste (ré-afficher la liste avec le nouveau patient)
      getPatients(1, 50, "").then(({ patients }) => setList(patients));
      // Pré-sélectionner le patient créé
      onChange(patient.id, {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
      });
      setSelectedLabel(`${patient.firstName} ${patient.lastName}`);
      setCreateModalOpen(false);
    },
    [onChange]
  );

  // Fermer la liste au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayValue = open ? search : selectedLabel;

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Label htmlFor={inputId}>Patient</Label>
      <div
        className={cn(
          "flex rounded-md border bg-background transition-colors",
          error && "border-rose-500",
          disabled && "opacity-50"
        )}
      >
        <div className="flex flex-1 items-center gap-2 px-3 py-2">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            id={inputId}
            value={displayValue}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Rechercher par nom ou email…"
            disabled={disabled}
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={!!error}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          className="flex items-center border-l px-2 text-muted-foreground hover:bg-muted/50"
          aria-label={open ? "Fermer la liste" : "Ouvrir la liste"}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Liste déroulante des patients + bouton Nouveau patient */}
      {open && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {/* Bouton "Nouveau patient" en tête de liste */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
          >
            <Plus className="h-4 w-4 text-[#2563eb]" />
            <span className="text-[#2563eb]">Nouveau patient</span>
          </button>
          <div className="my-1 h-px bg-border" />
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : list.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Aucun patient trouvé. Créez-en un avec &quot;Nouveau patient&quot;.
            </div>
          ) : (
            list.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={p.id === value}
                onClick={() => handleSelect(p)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                  p.id === value && "bg-accent"
                )}
              >
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{patientLabel(p)}</span>
                {p.email && (
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {p.email}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-500" role="alert">
          {error}
        </p>
      )}

      {/* Modal de création de patient (mode contrôlé) */}
      <CreatePatientModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onPatientCreated={handlePatientCreated}
      />
    </div>
  );
}
