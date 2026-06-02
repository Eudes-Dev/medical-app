/**
 * Tests d'intégration des Server Actions `CabinetProfile` (story 7.4).
 *
 * Prisma et l'auth Supabase sont mockés (convention `service-type-actions.test`).
 *
 * Couverture :
 * - `getCabinetProfile` ⇒ `UnauthorizedError` quand non-authentifié
 * - `updateCabinetProfile` upsert : crée si table vide, met à jour sinon
 * - `updateCabinetProfile` rejette une entrée invalide sans écrire
 * - `getPublicCabinetProfile` : public, n'expose que les champs d'affichage +
 *   libellé horaires dérivé ; repli `CABINET_INFO` si profil absent
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cabinetProfile: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workingHours: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CABINET_INFO } from "@/lib/cabinet/config";
import {
  getCabinetProfile,
  updateCabinetProfile,
} from "@/app/dashboard/settings/profile/actions";
import { getPublicCabinetProfile } from "@/lib/cabinet/public-profile";

const mockUser = { id: "user-123", email: "doc@example.com" };

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
  name: "Cabinet Médical",
  address: "12 rue de la Santé, 75014 Paris",
  phone: "01 23 45 67 89",
});

describe("getCabinetProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("renvoie le profil mappé", async () => {
    vi.mocked(prisma.cabinetProfile.findFirst).mockResolvedValue({
      name: "Cabinet",
      tagline: null,
      description: null,
      address: "1 rue X",
      phone: "01 23 45 67 89",
      email: null,
      accessInfo: null,
    } as never);

    const result = await getCabinetProfile();
    expect(result).toMatchObject({ name: "Cabinet", address: "1 rue X" });
  });

  it("renvoie null si la table est vide", async () => {
    vi.mocked(prisma.cabinetProfile.findFirst).mockResolvedValue(null as never);
    expect(await getCabinetProfile()).toBeNull();
  });

  it("lève UnauthorizedError si non-authentifié", async () => {
    setupAuthMock(false);
    await expect(getCabinetProfile()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("updateCabinetProfile (upsert singleton)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("crée le profil quand la table est vide", async () => {
    vi.mocked(prisma.cabinetProfile.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.cabinetProfile.create).mockResolvedValue({} as never);

    const res = await updateCabinetProfile(validInput());
    expect(res).toEqual({ success: true });
    expect(prisma.cabinetProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Cabinet Médical",
        address: "12 rue de la Santé, 75014 Paris",
        phone: "01 23 45 67 89",
        tagline: null,
        email: null,
      }),
    });
    expect(prisma.cabinetProfile.update).not.toHaveBeenCalled();
  });

  it("met à jour le profil existant (par id)", async () => {
    vi.mocked(prisma.cabinetProfile.findFirst).mockResolvedValue({
      id: "profile-1",
    } as never);
    vi.mocked(prisma.cabinetProfile.update).mockResolvedValue({} as never);

    const res = await updateCabinetProfile(validInput());
    expect(res).toEqual({ success: true });
    expect(prisma.cabinetProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: expect.objectContaining({ name: "Cabinet Médical" }),
    });
    expect(prisma.cabinetProfile.create).not.toHaveBeenCalled();
  });

  it("rejette une entrée invalide sans écrire", async () => {
    const res = await updateCabinetProfile({ ...validInput(), phone: "invalide" });
    expect("error" in res).toBe(true);
    expect(prisma.cabinetProfile.create).not.toHaveBeenCalled();
    expect(prisma.cabinetProfile.update).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non-authentifié", async () => {
    setupAuthMock(false);
    await expect(updateCabinetProfile(validInput())).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

describe("getPublicCabinetProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne requiert pas d'authentification et dérive le libellé horaires", async () => {
    vi.mocked(prisma.cabinetProfile.findFirst).mockResolvedValue({
      name: "Cabinet Public",
      tagline: "Accroche",
      description: null,
      address: "1 rue Y",
      phone: "01 23 45 67 89",
      email: null,
      accessInfo: null,
    } as never);
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue(
      [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      })) as never,
    );

    const result = await getPublicCabinetProfile();
    expect(result.name).toBe("Cabinet Public");
    expect(result.openingHoursLabel).toBe("Lun–Ven : 9h–18h");

    // select limité aux champs d'affichage (aucun champ interne sensible).
    const call = vi.mocked(prisma.cabinetProfile.findFirst).mock.calls[0][0]!;
    expect(call.select).toEqual({
      name: true,
      tagline: true,
      description: true,
      address: true,
      phone: true,
      email: true,
      accessInfo: true,
    });
  });

  it("applique le repli CABINET_INFO si le profil est absent", async () => {
    vi.mocked(prisma.cabinetProfile.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);

    const result = await getPublicCabinetProfile();
    expect(result.name).toBe(CABINET_INFO.name);
    expect(result.address).toBe(CABINET_INFO.address);
    expect(result.phone).toBe(CABINET_INFO.phone);
    expect(result.openingHoursLabel).toBe("Sur rendez-vous");
  });
});
