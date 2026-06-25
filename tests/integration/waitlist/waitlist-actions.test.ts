/**
 * Tests d'intégration des Server Actions de la liste d'attente (story 8.5).
 *
 * Prisma mocké (gabarit `recurring-actions.test.ts`). Couvre :
 * - `addToWaitlist` : patient inexistant → success:false ; service archivé →
 *   refus ; succès → `create` appelé avec `status:WAITING`.
 * - `getWaitlist` : filtre `WAITING`, tri priorité + FIFO.
 * - `removeFromWaitlist` : passe `CANCELLED` (pas de hard delete).
 * - `markWaitlistScheduled` : passe `SCHEDULED` + `resolvedAppointmentId`.
 * - `getMatchingWaitlistEntries` : entrée sans service matche tout ; entrée
 *   ciblée ne matche que le bon `serviceTypeId` ; fenêtre de dates respectée.
 * - `requireUser` appliqué (rejet non authentifié sur chaque action).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addToWaitlist,
  updateWaitlistEntry,
  getWaitlist,
  removeFromWaitlist,
  markWaitlistScheduled,
  getMatchingWaitlistEntries,
} from "@/app/dashboard/waitlist/actions";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waitlistEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
    },
    serviceType: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const mockUser = { id: "user-123", email: "doc@example.com" };
const PATIENT_UUID = "11111111-1111-4111-8111-111111111111";
const SERVICE_UUID = "22222222-2222-4222-8222-222222222222";
const ENTRY_UUID = "33333333-3333-4333-8333-333333333333";
const APPT_UUID = "44444444-4444-4444-8444-444444444444";

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as any);
}

const patientRow = {
  id: PATIENT_UUID,
  firstName: "Jean",
  lastName: "Martin",
  phone: "0600000000",
  email: null,
};

function entryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_UUID,
    patientId: PATIENT_UUID,
    priority: "NORMAL",
    status: "WAITING",
    reason: null,
    notes: null,
    preferredFrom: null,
    preferredTo: null,
    createdAt: new Date("2026-06-01T09:00:00Z"),
    patient: patientRow,
    serviceType: null,
    ...overrides,
  };
}

describe("Story 8.5 — addToWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("refuse un patient inexistant (success:false)", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null as any);

    const result = await addToWaitlist({ patientId: PATIENT_UUID, priority: "NORMAL" });

    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it("refuse un type de soin archivé (SEC-002)", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: PATIENT_UUID } as any);
    vi.mocked(prisma.serviceType.findUnique).mockResolvedValue({ active: false } as any);

    const result = await addToWaitlist({
      patientId: PATIENT_UUID,
      serviceTypeId: SERVICE_UUID,
      priority: "NORMAL",
    });

    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it("crée l'entrée avec status WAITING quand tout est valide", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: PATIENT_UUID } as any);
    vi.mocked(prisma.waitlistEntry.create).mockResolvedValue(entryRow() as any);

    const result = await addToWaitlist({
      patientId: PATIENT_UUID,
      priority: "HIGH",
      reason: "Suivi rapproché",
    });

    expect(result.success).toBe(true);
    const call = vi.mocked(prisma.waitlistEntry.create).mock.calls[0][0]!;
    expect(call.data).toMatchObject({ patientId: PATIENT_UUID, status: "WAITING" });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/waitlist");
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      addToWaitlist({ patientId: PATIENT_UUID, priority: "NORMAL" }),
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });
});

describe("Story 8.5 — updateWaitlistEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("édite une entrée WAITING (gardé sur status, remplacement complet)", async () => {
    vi.mocked(prisma.waitlistEntry.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(
      entryRow({ priority: "URGENT", reason: "Aggravation" }) as any,
    );

    const result = await updateWaitlistEntry(ENTRY_UUID, {
      priority: "URGENT",
      reason: "Aggravation",
    });

    expect(result.success).toBe(true);
    const call = vi.mocked(prisma.waitlistEntry.updateMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({ id: ENTRY_UUID, status: "WAITING" });
    // Remplacement complet : champs absents remis à null.
    expect(call.data).toMatchObject({
      priority: "URGENT",
      reason: "Aggravation",
      notes: null,
      preferredFrom: null,
      preferredTo: null,
      serviceTypeId: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/waitlist");
  });

  it("renvoie success:false si l'entrée n'est plus WAITING (count 0)", async () => {
    vi.mocked(prisma.waitlistEntry.updateMany).mockResolvedValue({ count: 0 } as any);

    const result = await updateWaitlistEntry(ENTRY_UUID, { priority: "HIGH" });

    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.findUnique).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuse un type de soin archivé (SEC-002), sans toucher la base", async () => {
    vi.mocked(prisma.serviceType.findUnique).mockResolvedValue({ active: false } as any);

    const result = await updateWaitlistEntry(ENTRY_UUID, {
      priority: "NORMAL",
      serviceTypeId: SERVICE_UUID,
    });

    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un id non-UUID (BadRequest)", async () => {
    const result = await updateWaitlistEntry("nope", { priority: "NORMAL" });
    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.updateMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      updateWaitlistEntry(ENTRY_UUID, { priority: "NORMAL" }),
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.waitlistEntry.updateMany).not.toHaveBeenCalled();
  });
});

describe("Story 8.5 — getWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("filtre WAITING et trie priorité décroissante puis FIFO", async () => {
    const t0 = new Date("2026-06-01T09:00:00Z");
    const t1 = new Date("2026-06-02T09:00:00Z");
    const t2 = new Date("2026-06-03T09:00:00Z");
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      entryRow({ id: "normal-old", priority: "NORMAL", createdAt: t0 }),
      entryRow({ id: "urgent-new", priority: "URGENT", createdAt: t2 }),
      entryRow({ id: "urgent-old", priority: "URGENT", createdAt: t0 }),
      entryRow({ id: "high", priority: "HIGH", createdAt: t1 }),
    ] as any);

    const result = await getWaitlist();

    expect(result.map((e) => e.id)).toEqual([
      "urgent-old",
      "urgent-new",
      "high",
      "normal-old",
    ]);
    const call = vi.mocked(prisma.waitlistEntry.findMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({ status: "WAITING" });
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(getWaitlist()).rejects.toThrow(UnauthorizedError);
  });
});

describe("Story 8.5 — removeFromWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("passe l'entrée à CANCELLED (pas de hard delete), gardé sur status WAITING", async () => {
    vi.mocked(prisma.waitlistEntry.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await removeFromWaitlist(ENTRY_UUID);

    expect(result.success).toBe(true);
    const call = vi.mocked(prisma.waitlistEntry.updateMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({ id: ENTRY_UUID, status: "WAITING" });
    expect(call.data).toMatchObject({ status: "CANCELLED" });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/waitlist");
  });

  it("renvoie success:false si l'entrée n'est plus WAITING (count 0, idempotent)", async () => {
    vi.mocked(prisma.waitlistEntry.updateMany).mockResolvedValue({ count: 0 } as any);

    const result = await removeFromWaitlist(ENTRY_UUID);

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuse un id non-UUID (BadRequest)", async () => {
    const result = await removeFromWaitlist("nope");
    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.updateMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(removeFromWaitlist(ENTRY_UUID)).rejects.toThrow(UnauthorizedError);
  });
});

describe("Story 8.5 — markWaitlistScheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("passe SCHEDULED + resolvedAppointmentId, gardé sur status WAITING", async () => {
    vi.mocked(prisma.waitlistEntry.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await markWaitlistScheduled(ENTRY_UUID, APPT_UUID);

    expect(result.success).toBe(true);
    const call = vi.mocked(prisma.waitlistEntry.updateMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({ id: ENTRY_UUID, status: "WAITING" });
    expect(call.data).toMatchObject({
      status: "SCHEDULED",
      resolvedAppointmentId: APPT_UUID,
    });
  });

  it("renvoie success:false si l'entrée n'est plus WAITING (count 0, pas de double conversion)", async () => {
    vi.mocked(prisma.waitlistEntry.updateMany).mockResolvedValue({ count: 0 } as any);

    const result = await markWaitlistScheduled(ENTRY_UUID, APPT_UUID);

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuse un appointmentId non-UUID (BadRequest)", async () => {
    const result = await markWaitlistScheduled(ENTRY_UUID, "pas-un-uuid");
    expect(result.success).toBe(false);
    expect(prisma.waitlistEntry.updateMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      markWaitlistScheduled(ENTRY_UUID, APPT_UUID),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe("Story 8.5 — getMatchingWaitlistEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("une entrée sans service matche n'importe quel créneau", async () => {
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      entryRow({ id: "any", serviceType: null }),
    ] as any);

    const result = await getMatchingWaitlistEntries({
      startTime: new Date("2026-06-15T10:00:00"),
      serviceTypeId: SERVICE_UUID,
    });

    expect(result.map((e) => e.id)).toEqual(["any"]);
  });

  it("une entrée ciblée ne matche que le bon serviceTypeId", async () => {
    const service = { id: SERVICE_UUID, label: "Détartrage", durationMin: 30, color: "blue" };
    const other = { id: "99999999-9999-4999-8999-999999999999", label: "Autre", durationMin: 30, color: "red" };
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      entryRow({ id: "match", serviceType: service }),
      entryRow({ id: "no-match", serviceType: other }),
    ] as any);

    const result = await getMatchingWaitlistEntries({
      startTime: new Date("2026-06-15T10:00:00"),
      serviceTypeId: SERVICE_UUID,
    });

    expect(result.map((e) => e.id)).toEqual(["match"]);
  });

  it("respecte la fenêtre de dates (jour hors bornes → exclu)", async () => {
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      entryRow({
        id: "in-window",
        preferredFrom: new Date(Date.UTC(2026, 5, 10)),
        preferredTo: new Date(Date.UTC(2026, 5, 20)),
      }),
      entryRow({
        id: "out-window",
        preferredFrom: new Date(Date.UTC(2026, 5, 1)),
        preferredTo: new Date(Date.UTC(2026, 5, 5)),
      }),
    ] as any);

    const result = await getMatchingWaitlistEntries({
      startTime: new Date(2026, 5, 15, 10, 0), // 15 juin local, dans [10,20]
    });

    expect(result.map((e) => e.id)).toEqual(["in-window"]);
  });

  it("respecte une fenêtre demi-ouverte (preferredFrom seul, preferredTo seul)", async () => {
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      // from-only : à partir du 10 juin → 15 juin OK.
      entryRow({ id: "from-ok", preferredFrom: new Date(Date.UTC(2026, 5, 10)) }),
      // from-only dans le futur : à partir du 20 juin → 15 juin exclu.
      entryRow({ id: "from-future", preferredFrom: new Date(Date.UTC(2026, 5, 20)) }),
      // to-only : jusqu'au 20 juin → 15 juin OK.
      entryRow({ id: "to-ok", preferredTo: new Date(Date.UTC(2026, 5, 20)) }),
      // to-only dans le passé : jusqu'au 5 juin → 15 juin exclu.
      entryRow({ id: "to-past", preferredTo: new Date(Date.UTC(2026, 5, 5)) }),
    ] as any);

    const result = await getMatchingWaitlistEntries({
      startTime: new Date(Date.UTC(2026, 5, 15, 10, 0)),
    });

    expect(result.map((e) => e.id).sort()).toEqual(["from-ok", "to-ok"]);
  });

  it("exclut une entrée ciblée si le créneau libéré est trop court (#4 durée)", async () => {
    const service = { id: SERVICE_UUID, label: "Soin long", durationMin: 60, color: "blue" };
    vi.mocked(prisma.waitlistEntry.findMany).mockResolvedValue([
      entryRow({ id: "needs-60", serviceType: service }),
      entryRow({ id: "any-care", serviceType: null }),
    ] as any);

    const result = await getMatchingWaitlistEntries({
      startTime: new Date(Date.UTC(2026, 5, 15, 10, 0)),
      serviceTypeId: SERVICE_UUID,
      durationMin: 15, // créneau libéré trop court pour le soin 60 min
    });

    // L'entrée ciblée 60 min est exclue ; l'entrée « tout soin » reste suggérée.
    expect(result.map((e) => e.id)).toEqual(["any-care"]);
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      getMatchingWaitlistEntries({ startTime: new Date() }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe("Story 8.5 — DTO sans fuite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("le mapper n'expose pas les champs internes (resolvedAppointmentId, updatedAt)", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({ id: PATIENT_UUID } as any);
    vi.mocked(prisma.waitlistEntry.create).mockResolvedValue(
      entryRow({
        resolvedAppointmentId: APPT_UUID,
        updatedAt: new Date("2026-06-02T09:00:00Z"),
      }) as any,
    );

    const result = await addToWaitlist({ patientId: PATIENT_UUID, priority: "NORMAL" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.entry).not.toHaveProperty("resolvedAppointmentId");
      expect(result.entry).not.toHaveProperty("updatedAt");
    }
  });
});
