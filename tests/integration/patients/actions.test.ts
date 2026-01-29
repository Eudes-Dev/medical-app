/**
 * Tests d'intégration pour les Server Actions de gestion des patients
 *
 * Story 2.1: getPatients (2.1-INT-004 à 2.1-INT-013)
 * Story 2.2: createPatient, updatePatient, getPatientById, deletePatient (2.2-INT-001 à 2.2-INT-011)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPatients,
  createPatient,
  updatePatient,
  getPatientById,
  deletePatient,
} from "@/app/dashboard/patients/actions";
import { UnauthorizedError } from "@/lib/errors";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Prisma (2.1: findMany, count ; 2.2: create, update, findUnique, delete)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

describe("getPatients", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock utilisateur authentifié par défaut
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
        }),
      },
    } as any);
  });

  it("2.1-INT-004: devrait retourner tous les patients sans filtre", async () => {
    const mockPatients = [
      {
        id: "patient-1",
        firstName: "Jean",
        lastName: "Martin",
        email: "jean@example.com",
        phone: "0612345678",
      },
      {
        id: "patient-2",
        firstName: "Marie",
        lastName: "Dupont",
        email: "marie@example.com",
        phone: "0698765432",
      },
    ];

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(2);

    const result = await getPatients(1, 10);

    expect(result.patients).toEqual(mockPatients);
    expect(result.total).toBe(2);
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
  });

  it("2.1-INT-005: devrait filtrer par firstName avec recherche", async () => {
    const mockPatients = [
      {
        id: "patient-1",
        firstName: "Jean",
        lastName: "Martin",
        email: "jean@example.com",
        phone: "0612345678",
      },
    ];

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(1);

    await getPatients(1, 10, "Jean");

    const findManyCall = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(findManyCall?.where?.OR).toContainEqual({
      firstName: { contains: "Jean", mode: "insensitive" },
    });
  });

  it("2.1-INT-006: devrait filtrer par lastName avec recherche", async () => {
    const mockPatients = [
      {
        id: "patient-1",
        firstName: "Jean",
        lastName: "Martin",
        email: "jean@example.com",
        phone: "0612345678",
      },
    ];

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(1);

    await getPatients(1, 10, "Martin");

    const findManyCall = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(findManyCall?.where?.OR).toContainEqual({
      lastName: { contains: "Martin", mode: "insensitive" },
    });
  });

  it("2.1-INT-007: devrait filtrer par email avec recherche", async () => {
    const mockPatients = [
      {
        id: "patient-1",
        firstName: "Jean",
        lastName: "Martin",
        email: "jean@example.com",
        phone: "0612345678",
      },
    ];

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(1);

    // Utiliser seulement "jean" car le schéma de validation ne permet pas "@"
    await getPatients(1, 10, "jean");

    const findManyCall = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(findManyCall?.where?.OR).toContainEqual({
      email: { contains: "jean", mode: "insensitive" },
    });
  });

  it("2.1-INT-008: devrait retourner 10 résultats avec pagination", async () => {
    const mockPatients = Array.from({ length: 10 }, (_, i) => ({
      id: `patient-${i}`,
      firstName: `Patient${i}`,
      lastName: `Test${i}`,
      email: `patient${i}@example.com`,
      phone: `061234567${i}`,
    }));

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(25);

    const result = await getPatients(1, 10);

    expect(result.patients).toHaveLength(10);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      })
    );
  });

  it("devrait gérer la pagination pour la page 2", async () => {
    const mockPatients = Array.from({ length: 10 }, (_, i) => ({
      id: `patient-${i + 10}`,
      firstName: `Patient${i + 10}`,
      lastName: `Test${i + 10}`,
      email: `patient${i + 10}@example.com`,
      phone: `061234567${i + 10}`,
    }));

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(25);

    await getPatients(2, 10);

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (page - 1) * limit = (2 - 1) * 10 = 10
        take: 10,
      })
    );
  });

  it("2.1-INT-009: devrait retourner le total correct pour la pagination avec filtres", async () => {
    const mockPatients = [
      {
        id: "patient-1",
        firstName: "Jean",
        lastName: "Martin",
        email: "jean@example.com",
        phone: "0612345678",
      },
    ];

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(5); // Total de 5 patients correspondant au filtre

    const result = await getPatients(1, 10, "Martin");

    expect(result.total).toBe(5);
    // Vérifier que count est appelé avec les mêmes filtres que findMany
    expect(prisma.patient.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { lastName: { contains: "Martin", mode: "insensitive" } },
        ]),
      }),
    });
  });

  it("2.1-INT-010: devrait lever une UnauthorizedError si l'utilisateur n'est pas authentifié", async () => {
    // Mock utilisateur non authentifié
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as any);

    await expect(getPatients(1, 10)).rejects.toThrow(UnauthorizedError);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it("2.1-INT-013: devrait effectuer une recherche insensible à la casse", async () => {
    const mockPatients = [
      {
        id: "patient-1",
        firstName: "Jean",
        lastName: "Martin",
        email: "jean@example.com",
        phone: "0612345678",
      },
    ];

    vi.mocked(prisma.patient.findMany).mockResolvedValue(mockPatients as any);
    vi.mocked(prisma.patient.count).mockResolvedValue(1);

    // Recherche avec différentes casse
    await getPatients(1, 10, "JEAN");
    const call1 = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(call1?.where?.OR?.[0]?.firstName?.mode).toBe("insensitive");

    vi.clearAllMocks();
    await getPatients(1, 10, "martin");
    const call2 = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(call2?.where?.OR?.[1]?.lastName?.mode).toBe("insensitive");

    vi.clearAllMocks();
    // Utiliser seulement "jean" car le schéma ne permet pas "@"
    await getPatients(1, 10, "JEAN");
    const call3 = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(call3?.where?.OR?.[2]?.email?.mode).toBe("insensitive");
  });

  it("devrait valider les paramètres de pagination", async () => {
    // Test avec page invalide (négative)
    await expect(getPatients(-1, 10)).rejects.toThrow(
      "Invalid pagination parameters"
    );

    // Test avec limit trop grand
    await expect(getPatients(1, 200)).rejects.toThrow(
      "Invalid pagination parameters"
    );
  });

  it("devrait valider le paramètre de recherche", async () => {
    // Test avec recherche trop longue (> 100 caractères)
    const longSearch = "a".repeat(101);
    await expect(getPatients(1, 10, longSearch)).rejects.toThrow(
      "Invalid search parameter"
    );
  });
});

// --- Story 2.2: CRUD Patient (createPatient, updatePatient, getPatientById, deletePatient) ---

const mockUser = { id: "user-123", email: "test@example.com" };

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as any);
}

describe("createPatient (Story 2.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("2.2-INT-001: devrait retourner erreur si données invalides", async () => {
    const result = await createPatient({
      lastName: "M",
      firstName: "Jean",
      phone: "0612345678",
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("invalides"),
      })
    );
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });

  it("2.2-INT-003: devrait créer le patient en base avec données valides", async () => {
    const newPatient = {
      id: "patient-new",
      firstName: "Jean",
      lastName: "Martin",
      email: "jean@example.com",
      phone: "0612345678",
    };
    vi.mocked(prisma.patient.create).mockResolvedValue(newPatient as any);

    const result = await createPatient({
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
      email: "jean@example.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.patient).toEqual(newPatient);
    }
    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: {
        firstName: "Jean",
        lastName: "Martin",
        phone: "0612345678",
        email: "jean@example.com",
      },
    });
  });

  it("2.2-INT-004: devrait revalider la liste après création", async () => {
    const { revalidatePath } = await import("next/cache");
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      firstName: "Jean",
      lastName: "Martin",
      email: null,
      phone: "0612345678",
    } as any);

    await createPatient({
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/patients");
  });

  it("devrait retourner erreur si non authentifié", async () => {
    setupAuthMock(false);
    const result = await createPatient({
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("connecté"),
      })
    );
    expect(prisma.patient.create).not.toHaveBeenCalled();
  });
});

describe("updatePatient (Story 2.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("2.2-INT-002: devrait retourner erreur si données invalides", async () => {
    const result = await updatePatient("patient-1", {
      lastName: "Martin",
      firstName: "J",
      phone: "0612345678",
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("invalides"),
      })
    );
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it("2.2-INT-008: devrait mettre à jour le patient en base", async () => {
    const updatedPatient = {
      id: "patient-1",
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
      email: "jean@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      appointments: [],
    };
    vi.mocked(prisma.patient.update).mockResolvedValue(updatedPatient as any);

    const result = await updatePatient("patient-1", {
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
      email: "jean@example.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.patient.id).toBe("patient-1");
    }
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: "patient-1" },
      data: {
        firstName: "Jean",
        lastName: "Martin",
        phone: "0612345678",
        email: "jean@example.com",
      },
      include: { appointments: { orderBy: { startTime: "desc" } } },
    });
  });

  it("2.2-INT-009: devrait revalider la liste et la fiche après mise à jour", async () => {
    const { revalidatePath } = await import("next/cache");
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "patient-1",
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      appointments: [],
    } as any);

    await updatePatient("patient-1", {
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/patients");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/patients/patient-1");
  });
});

describe("getPatientById (Story 2.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("2.2-INT-005: devrait retourner le patient avec appointments", async () => {
    const patientWithAppointments = {
      id: "patient-1",
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
      email: "jean@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      appointments: [
        {
          id: "apt-1",
          startTime: new Date(),
          endTime: new Date(),
          status: "CONFIRMED",
          type: "consultation",
        },
      ],
    };
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(
      patientWithAppointments as any
    );

    const result = await getPatientById("patient-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("patient-1");
    expect(result?.appointments).toHaveLength(1);
    expect(result?.appointments[0].status).toBe("CONFIRMED");
    expect(prisma.patient.findUnique).toHaveBeenCalledWith({
      where: { id: "patient-1" },
      include: {
        appointments: { orderBy: { startTime: "desc" } },
      },
    });
  });

  it("2.2-INT-006: devrait lever UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(getPatientById("patient-1")).rejects.toThrow(UnauthorizedError);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it("2.2-INT-007: devrait retourner null si id inexistant", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);

    const result = await getPatientById("patient-inexistant");

    expect(result).toBeNull();
  });

  it("devrait retourner null si id vide/undefined", async () => {
    expect(await getPatientById(undefined)).toBeNull();
    expect(await getPatientById(null)).toBeNull();
    expect(await getPatientById("")).toBeNull();
  });
});

describe("deletePatient (Story 2.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("2.2-INT-010: devrait supprimer le patient et retourner success", async () => {
    vi.mocked(prisma.patient.delete).mockResolvedValue({} as any);

    const result = await deletePatient("patient-1");

    expect(result).toEqual({ success: true });
    expect(prisma.patient.delete).toHaveBeenCalledWith({
      where: { id: "patient-1" },
    });
  });

  it("2.2-INT-011: devrait retourner erreur si non authentifié", async () => {
    setupAuthMock(false);
    const result = await deletePatient("patient-1");
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("connecté"),
      })
    );
    expect(prisma.patient.delete).not.toHaveBeenCalled();
  });

  it("devrait revalider les paths après suppression", async () => {
    const { revalidatePath } = await import("next/cache");
    vi.mocked(prisma.patient.delete).mockResolvedValue({} as any);

    await deletePatient("patient-1");

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/patients");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/patients/patient-1");
  });
});
