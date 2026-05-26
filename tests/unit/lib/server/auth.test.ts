import { describe, it, expect, vi, beforeEach } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

import { requireUser, getCurrentUser } from "@/lib/server/auth";

describe("lib/server/auth", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it("requireUser retourne l'utilisateur quand authentifié", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u-123", email: "doc@test.local" } },
    });
    const user = await requireUser();
    expect(user).toEqual({ id: "u-123", email: "doc@test.local" });
  });

  it("requireUser throw UnauthorizedError quand user est null", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("getCurrentUser retourne l'utilisateur quand authentifié", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u-7", email: "x@test.local" } },
    });
    const user = await getCurrentUser();
    expect(user).toEqual({ id: "u-7", email: "x@test.local" });
  });

  it("getCurrentUser retourne null si non authentifié (non bloquant)", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
