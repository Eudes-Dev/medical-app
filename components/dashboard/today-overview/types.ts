import type * as React from "react";

export type AlertTone = "warning" | "info" | "danger" | "primary";

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  tone: AlertTone;
  icon: React.ReactNode;
  count?: number;
  href?: string;
}

export type ConsultationStatus =
  | "scheduled"
  | "live"
  | "confirmed"
  | "pending";

export type ConsultationKind = "in-person" | "teleconsultation";

export interface Consultation {
  id: string;
  time: string;
  durationMin: number;
  patientName: string;
  reason: string;
  status: ConsultationStatus;
  kind: ConsultationKind;
  avatarUrl?: string;
}

export type ConsultationRange = "today" | "tomorrow" | "week";
