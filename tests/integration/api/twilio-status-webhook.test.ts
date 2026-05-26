/**
 * Tests d'intégration du webhook Twilio Status (story 6.3, Task 8).
 *
 * Vérifie :
 *  - 401 si secret manquant ou incorrect
 *  - 403 si signature HMAC Twilio invalide (QA SEC-001)
 *  - 400 si MessageSid manquant
 *  - Mise à jour de MessageLog.cost / costUnit / status sur succès
 *  - Mapping des statuts Twilio → MessageStatus
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { mockValidateRequest } = vi.hoisted(() => ({
  mockValidateRequest: vi.fn(() => true),
}));

vi.mock("twilio", () => ({
  default: { validateRequest: mockValidateRequest },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    messageLog: {
      updateMany: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/webhooks/twilio/status/route";
import { prisma } from "@/lib/prisma";

const SECRET = "test-webhook-secret";

function makeRequest(secret: string | null, formBody: Record<string, string>): Request {
  const search = secret === null ? "" : `?secret=${encodeURIComponent(secret)}`;
  const body = new URLSearchParams(formBody).toString();
  return new Request(`http://localhost/api/webhooks/twilio/status${search}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": "fake-signature",
    },
    body,
  });
}

describe("POST /api/webhooks/twilio/status", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRequest.mockReturnValue(true);
    process.env = {
      ...originalEnv,
      TWILIO_STATUS_WEBHOOK_SECRET: SECRET,
      TWILIO_AUTH_TOKEN: "token_test",
    };
    vi.mocked(prisma.messageLog.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("retourne 401 si secret manquant", async () => {
    const res = await POST(makeRequest(null, { MessageSid: "SM_x" }));
    expect(res.status).toBe(401);
  });

  it("retourne 401 si secret incorrect", async () => {
    const res = await POST(makeRequest("wrong", { MessageSid: "SM_x" }));
    expect(res.status).toBe(401);
  });

  it("retourne 403 si la signature Twilio est invalide", async () => {
    mockValidateRequest.mockReturnValueOnce(false);

    const res = await POST(
      makeRequest(SECRET, { MessageSid: "SM_x", MessageStatus: "delivered" }),
    );

    expect(res.status).toBe(403);
    expect(prisma.messageLog.updateMany).not.toHaveBeenCalled();
  });

  it("retourne 400 si MessageSid absent", async () => {
    const res = await POST(makeRequest(SECRET, { MessageStatus: "delivered" }));
    expect(res.status).toBe(400);
  });

  it("met à jour cost / costUnit / status SENT pour MessageStatus=delivered", async () => {
    const res = await POST(
      makeRequest(SECRET, {
        MessageSid: "SM_abc",
        MessageStatus: "delivered",
        Price: "-0.05000",
        PriceUnit: "EUR",
      }),
    );

    expect(res.status).toBe(200);
    expect(prisma.messageLog.updateMany).toHaveBeenCalledWith({
      where: { providerMessageId: "SM_abc" },
      data: { status: "SENT", cost: 0.05, costUnit: "EUR" },
    });
  });

  it("met à jour status FAILED pour MessageStatus=failed", async () => {
    const res = await POST(
      makeRequest(SECRET, {
        MessageSid: "SM_fail",
        MessageStatus: "failed",
      }),
    );

    expect(res.status).toBe(200);
    expect(prisma.messageLog.updateMany).toHaveBeenCalledWith({
      where: { providerMessageId: "SM_fail" },
      data: { status: "FAILED" },
    });
  });

  it("ignore les statuts intermédiaires (queued, sending)", async () => {
    const res = await POST(
      makeRequest(SECRET, { MessageSid: "SM_q", MessageStatus: "queued" }),
    );

    expect(res.status).toBe(200);
    // Aucun champ data à mettre à jour → updateMany pas appelé
    expect(prisma.messageLog.updateMany).not.toHaveBeenCalled();
  });

  it("convertit Price négatif Twilio en valeur absolue", async () => {
    await POST(
      makeRequest(SECRET, {
        MessageSid: "SM_neg",
        MessageStatus: "delivered",
        Price: "-0.07500",
        PriceUnit: "EUR",
      }),
    );

    expect(prisma.messageLog.updateMany).toHaveBeenCalledWith({
      where: { providerMessageId: "SM_neg" },
      data: expect.objectContaining({ cost: 0.075 }),
    });
  });
});
