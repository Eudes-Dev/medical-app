/**
 * Tests d'intégration des Server Actions `ServiceType` (story 7.3).
 *
 * Prisma et l'auth Supabase sont mockés (convention `time-off-actions.test`).
 *
 * Couverture :
 * - `requireUser` ⇒ `UnauthorizedError` quand non-authentifié
 * - `getServiceTypes` mappe `Decimal → number`
 * - `createServiceType` persiste / rejette une entrée invalide
 * - `deleteServiceType` refuse (`HAS_APPOINTMENTS`) si des RDV sont rattachés,
 *   supprime sinon
 * - `toggleServiceTypeActive` archive / réactive
 * - `getPublicServiceTypes` ne filtre que `active && isPublic` (select limité)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceType: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    appointment: {
      count: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createServiceType,
  deleteServiceType,
  getPublicServiceTypes,
  getServiceTypes,
  toggleServiceTypeActive,
} from "@/app/dashboard/settings/services/actions";

const mockUser = { id: "user-123", email: "doc@example.com" };
const UUID = "00000000-0000-4000-8000-000000000001";

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as never);
}

const validInput = () => ({
  label: "Première consultation",
  durationMin: 30,
  color: "emerald" as const,
  price: 50,
  description: "Bilan initial",
  isPublic: true,
  active: true,
});

describe("getServiceTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("mappe price Decimal → number et renvoie les DTO", async () => {
    vi.mocked(prisma.serviceType.findMany).mockResolvedValue([
      {
        id: UUID,
        label: "Suivi",
        durationMin: 30,
        color: "blue",
        // Simule un Decimal Prisma (objet avec toString()).
        price: { toString: () => "45.50" },
        description: null,
        isPublic: true,
        active: true,
      },
    ] as never);

    const result = await getServiceTypes();
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(45.5);
    expect(typeof result[0].price).toBe("number");
  });

  it("renvoie price null quand absent", async () => {
    vi.mocked(prisma.serviceType.findMany).mockResolvedValue([
      {
        id: UUID,
        label: "Urgence",
        durationMin: 15,
        color: "rose",
        price: null,
        description: null,
        isPublic: false,
        active: true,
      },
    ] as never);

    const result = await getServiceTypes();
    expect(result[0].price).toBeNull();
  });

  it("lève UnauthorizedError si non-authentifié", async () => {
    setupAuthMock(false);
    await expect(getServiceTypes()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("createServiceType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("persiste un type de soin valide", async () => {
    vi.mocked(prisma.serviceType.create).mockResolvedValue({ id: UUID } as never);
    const res = await createServiceType(validInput());
    expect(res).toEqual({ success: true });
    expect(prisma.serviceType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        label: "Première consultation",
        durationMin: 30,
        color: "emerald",
        price: 50,
        isPublic: true,
        active: true,
      }),
    });
  });

  it("rejette une entrée invalide sans écrire", async () => {
    const res = await createServiceType({ ...validInput(), durationMin: 20 });
    expect("error" in res).toBe(true);
    expect(prisma.serviceType.create).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non-authentifié", async () => {
    setupAuthMock(false);
    await expect(createServiceType(validInput())).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

describe("deleteServiceType (suppression protégée)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("refuse la suppression si des RDV sont rattachés (HAS_APPOINTMENTS)", async () => {
    vi.mocked(prisma.appointment.count).mockResolvedValue(3 as never);
    const res = await deleteServiceType(UUID);
    expect(res).toEqual({ error: "HAS_APPOINTMENTS" });
    expect(prisma.serviceType.delete).not.toHaveBeenCalled();
  });

  it("supprime un service sans RDV rattaché", async () => {
    vi.mocked(prisma.appointment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.serviceType.delete).mockResolvedValue({} as never);
    const res = await deleteServiceType(UUID);
    expect(res).toEqual({ success: true });
    expect(prisma.serviceType.delete).toHaveBeenCalledWith({
      where: { id: UUID },
    });
  });

  it("rejette un id non-UUID", async () => {
    const res = await deleteServiceType("not-a-uuid");
    expect("error" in res).toBe(true);
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });
});

describe("toggleServiceTypeActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("archive un service (active=false)", async () => {
    vi.mocked(prisma.serviceType.update).mockResolvedValue({} as never);
    const res = await toggleServiceTypeActive(UUID, false);
    expect(res).toEqual({ success: true });
    expect(prisma.serviceType.update).toHaveBeenCalledWith({
      where: { id: UUID },
      data: { active: false },
    });
  });

  it("rejette un id non-UUID", async () => {
    const res = await toggleServiceTypeActive("invalid", true);
    expect("error" in res).toBe(true);
    expect(prisma.serviceType.update).not.toHaveBeenCalled();
  });
});

describe("getPublicServiceTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne filtre que les services active && isPublic avec un select limité", async () => {
    vi.mocked(prisma.serviceType.findMany).mockResolvedValue([
      {
        id: UUID,
        label: "Consultation",
        durationMin: 30,
        price: { toString: () => "50.00" },
        description: "Desc",
        color: "emerald",
      },
    ] as never);

    const result = await getPublicServiceTypes();

    const call = vi.mocked(prisma.serviceType.findMany).mock.calls[0][0]!;
    expect(call.where).toEqual({ active: true, isPublic: true });
    expect(call.select).toEqual({
      id: true,
      label: true,
      durationMin: true,
      price: true,
      description: true,
      color: true,
    });
    expect(result[0].price).toBe(50);
  });

  it("ne requiert pas d'authentification (action publique)", async () => {
    // Aucun mock d'auth configuré : l'action ne doit pas lever.
    vi.mocked(prisma.serviceType.findMany).mockResolvedValue([] as never);
    await expect(getPublicServiceTypes()).resolves.toEqual([]);
  });
});
