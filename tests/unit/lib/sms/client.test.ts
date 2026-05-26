// @vitest-environment node
/**
 * Tests unitaires de `lib/sms/client` (story 6.3, Task 4).
 *
 * Vérifie :
 *  - no-op quand SMS_ENABLED !== "true"
 *  - succès : MessageLog SENT créé avec channel SMS + providerMessageId
 *  - échec Twilio : MessageLog FAILED + appel du fallbackEmailFactory si fourni
 *  - aucun throw côté appelant
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockMessagesCreate, mockMessageLogCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
  mockMessageLogCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock("twilio", () => ({
  default: () => ({ messages: { create: mockMessagesCreate } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { messageLog: { create: mockMessageLogCreate } },
}));

const { sendSms } = await import("@/lib/sms/client");

describe("sendSms", () => {
  const baseOptions = {
    to: "+33612345678",
    body: "Test SMS",
    appointmentId: "appt-1",
    type: "CONFIRMATION" as const,
  };

  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageLogCreate.mockResolvedValue({});
    process.env = {
      ...originalEnv,
      SMS_ENABLED: "true",
      TWILIO_ACCOUNT_SID: "AC_test",
      TWILIO_AUTH_TOKEN: "token_test",
      TWILIO_PHONE_NUMBER: "+33700000000",
      TWILIO_STATUS_WEBHOOK_SECRET: "secret_test",
      NEXT_PUBLIC_APP_URL: "https://example.test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("no-op quand SMS_ENABLED n'est pas 'true'", async () => {
    process.env.SMS_ENABLED = "false";

    await sendSms(baseOptions);

    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(mockMessageLogCreate).not.toHaveBeenCalled();
  });

  it("crée un MessageLog SMS SENT avec le providerMessageId en cas de succès", async () => {
    mockMessagesCreate.mockResolvedValueOnce({ sid: "SM_xyz" });

    await sendSms(baseOptions);

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+33612345678",
        from: "+33700000000",
        body: "Test SMS",
        statusCallback: expect.stringContaining("/api/webhooks/twilio/status?secret=secret_test"),
      }),
    );
    expect(mockMessageLogCreate).toHaveBeenCalledWith({
      data: {
        appointmentId: "appt-1",
        channel: "SMS",
        to: "+33612345678",
        type: "CONFIRMATION",
        status: "SENT",
        providerMessageId: "SM_xyz",
      },
    });
  });

  it("crée un MessageLog FAILED si Twilio throw, sans throw côté appelant", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("Twilio error"));

    await expect(sendSms(baseOptions)).resolves.toBeUndefined();

    expect(mockMessageLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        channel: "SMS",
        status: "FAILED",
        error: "Twilio error",
      }),
    });
  });

  it("invoque le fallbackEmailFactory si fourni en cas d'échec SMS", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("Twilio down"));
    const fallback = vi.fn().mockResolvedValue(undefined);

    await sendSms({
      ...baseOptions,
      fallbackEmail: "patient@test.com",
      fallbackEmailFactory: fallback,
    });

    expect(fallback).toHaveBeenCalledOnce();
  });

  it("n'invoque pas le fallback si SMS_ENABLED=false (no-op)", async () => {
    process.env.SMS_ENABLED = "false";
    const fallback = vi.fn();

    await sendSms({
      ...baseOptions,
      fallbackEmail: "patient@test.com",
      fallbackEmailFactory: fallback,
    });

    expect(fallback).not.toHaveBeenCalled();
  });

  it("ne throw pas même si MessageLog.create échoue après un échec Twilio", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("Twilio error"));
    mockMessageLogCreate.mockRejectedValueOnce(new Error("DB down"));

    await expect(sendSms(baseOptions)).resolves.toBeUndefined();
  });

  it("retourne sans envoyer si TWILIO_PHONE_NUMBER absent", async () => {
    delete process.env.TWILIO_PHONE_NUMBER;

    await sendSms(baseOptions);

    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});
