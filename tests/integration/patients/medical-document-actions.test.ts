/**
 * Tests d'intégration des Server Actions de documents médicaux (story 9.2).
 *
 * Scénarios 9.2-INT-001 à 9.2-INT-012.
 *
 * Prisma, Supabase et l'abstraction Storage sont mockés (aucune base ni storage
 * requis) — même harnais que `tests/integration/patients/consultation-notes-actions.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getMedicalDocuments,
  createMedicalDocument,
  getMedicalDocumentDownloadUrl,
  deleteMedicalDocument,
} from "@/app/dashboard/patients/medical-document-actions";
import { UnauthorizedError } from "@/lib/errors";

// Mock Supabase (auth)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Prisma (medicalDocument: findMany, create, findUnique, delete)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    medicalDocument: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock abstraction Storage
vi.mock("@/lib/storage/medical-documents", () => ({
  MEDICAL_DOCS_BUCKET: "medical-documents",
  createUploadUrl: vi.fn(),
  createDownloadUrl: vi.fn(),
  removeObject: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  createUploadUrl,
  createDownloadUrl,
  removeObject,
} from "@/lib/storage/medical-documents";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const DOC_ID = "22222222-2222-4222-8222-222222222222";
const mockUser = { id: "user-123", email: "test@example.com" };

function mockAuthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
  } as any);
}

function mockUnauthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  } as any);
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DOC_ID,
    patientId: PATIENT_ID,
    storagePath: `patients/${PATIENT_ID}/abc.pdf`,
    fileName: "ordonnance.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    category: "PRESCRIPTION",
    createdAt: new Date("2026-06-25T10:00:00Z"),
    updatedAt: new Date("2026-06-25T10:00:00Z"),
    ...overrides,
  };
}

function validMeta(overrides: Record<string, unknown> = {}) {
  return {
    fileName: "ordonnance.pdf",
    mimeType: "application/pdf" as const,
    sizeBytes: 2048,
    category: "PRESCRIPTION" as const,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("getMedicalDocuments", () => {
  it("9.2-INT-001: retourne les documents triés desc et SANS storagePath", async () => {
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([
      makeRow(),
    ] as any);

    const result = await getMedicalDocuments(PATIENT_ID);

    expect(prisma.medicalDocument.findMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("storagePath");
    expect(result[0].fileName).toBe("ordonnance.pdf");
  });

  it("9.2-INT-002: lève UnauthorizedError si non authentifié", async () => {
    mockUnauthed();
    await expect(getMedicalDocuments(PATIENT_ID)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    expect(prisma.medicalDocument.findMany).not.toHaveBeenCalled();
  });

  it("9.2-INT-003: retourne [] si UUID invalide (pas d'appel Prisma)", async () => {
    const result = await getMedicalDocuments("not-a-uuid");
    expect(result).toEqual([]);
    expect(prisma.medicalDocument.findMany).not.toHaveBeenCalled();
  });
});

describe("createMedicalDocument", () => {
  it("9.2-INT-004: crée la métadonnée + URL d'upload, revalide, retourne upload", async () => {
    vi.mocked(createUploadUrl).mockResolvedValue({
      token: "tok",
      signedUrl: "https://signed.example/upload",
    });
    vi.mocked(prisma.medicalDocument.create).mockResolvedValue(makeRow() as any);

    const result = await createMedicalDocument(PATIENT_ID, validMeta());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.upload.bucket).toBe("medical-documents");
      expect(result.upload.token).toBe("tok");
      expect(result.upload.signedUrl).toBe("https://signed.example/upload");
      expect(result.upload.path).toMatch(
        new RegExp(`^patients/${PATIENT_ID}/[0-9a-f-]{36}\\.pdf$`)
      );
      expect(result.document).not.toHaveProperty("storagePath");
    }
    expect(createUploadUrl).toHaveBeenCalledTimes(1);
    expect(prisma.medicalDocument.create).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.2-INT-005: refuse une métadonnée invalide (mime) sans storage ni Prisma", async () => {
    const result = await createMedicalDocument(
      PATIENT_ID,
      validMeta({ mimeType: "application/zip" }) as any
    );
    expect(result.success).toBe(false);
    expect(createUploadUrl).not.toHaveBeenCalled();
    expect(prisma.medicalDocument.create).not.toHaveBeenCalled();
  });

  it("9.2-INT-006: refuse une taille > 10 Mo sans storage ni Prisma", async () => {
    const result = await createMedicalDocument(
      PATIENT_ID,
      validMeta({ sizeBytes: 11 * 1024 * 1024 })
    );
    expect(result.success).toBe(false);
    expect(createUploadUrl).not.toHaveBeenCalled();
    expect(prisma.medicalDocument.create).not.toHaveBeenCalled();
  });

  it("9.2-INT-007: échoue (UUID patient invalide) sans storage ni Prisma", async () => {
    const result = await createMedicalDocument("bad", validMeta());
    expect(result.success).toBe(false);
    expect(createUploadUrl).not.toHaveBeenCalled();
    expect(prisma.medicalDocument.create).not.toHaveBeenCalled();
  });

  it("9.2-INT-008: échoue proprement si non authentifié", async () => {
    mockUnauthed();
    const result = await createMedicalDocument(PATIENT_ID, validMeta());
    expect(result.success).toBe(false);
    expect(createUploadUrl).not.toHaveBeenCalled();
    expect(prisma.medicalDocument.create).not.toHaveBeenCalled();
  });

  it("9.2-INT-013: si l'URL d'upload échoue, aucune ligne orpheline n'est créée", async () => {
    vi.mocked(createUploadUrl).mockRejectedValue(new Error("storage down"));

    const result = await createMedicalDocument(PATIENT_ID, validMeta());

    expect(result.success).toBe(false);
    expect(prisma.medicalDocument.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("getMedicalDocumentDownloadUrl", () => {
  it("9.2-INT-009: retourne une URL signée pour un document existant", async () => {
    vi.mocked(prisma.medicalDocument.findUnique).mockResolvedValue(
      makeRow() as any
    );
    vi.mocked(createDownloadUrl).mockResolvedValue(
      "https://signed.example/download"
    );

    const result = await getMedicalDocumentDownloadUrl(DOC_ID);

    expect(result).toEqual({
      success: true,
      url: "https://signed.example/download",
    });
    expect(createDownloadUrl).toHaveBeenCalledWith(
      `patients/${PATIENT_ID}/abc.pdf`
    );
  });

  it("9.2-INT-010: échoue si document introuvable (pas d'URL)", async () => {
    vi.mocked(prisma.medicalDocument.findUnique).mockResolvedValue(null as any);
    const result = await getMedicalDocumentDownloadUrl(DOC_ID);
    expect(result.success).toBe(false);
    expect(createDownloadUrl).not.toHaveBeenCalled();
  });
});

describe("deleteMedicalDocument", () => {
  it("9.2-INT-011: supprime l'objet Storage PUIS la ligne et revalide", async () => {
    vi.mocked(prisma.medicalDocument.findUnique).mockResolvedValue(
      makeRow() as any
    );
    vi.mocked(removeObject).mockResolvedValue(undefined);
    vi.mocked(prisma.medicalDocument.delete).mockResolvedValue(makeRow() as any);

    const result = await deleteMedicalDocument(DOC_ID);

    expect(result.success).toBe(true);
    expect(removeObject).toHaveBeenCalledWith(`patients/${PATIENT_ID}/abc.pdf`);
    expect(prisma.medicalDocument.delete).toHaveBeenCalledWith({
      where: { id: DOC_ID },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.2-INT-012: échoue (UUID invalide) sans toucher storage ni Prisma", async () => {
    const result = await deleteMedicalDocument("bad");
    expect(result.success).toBe(false);
    expect(removeObject).not.toHaveBeenCalled();
    expect(prisma.medicalDocument.delete).not.toHaveBeenCalled();
  });
});
