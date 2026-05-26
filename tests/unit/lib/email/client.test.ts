// @vitest-environment node
/**
 * Tests unitaires de `lib/email/client` (Story 6.1, mis à jour 6.3).
 *
 * Vérifie :
 * - Succès : MessageLog créé avec channel EMAIL, status SENT + providerMessageId.
 * - Échec Resend (error retourné) : MessageLog FAILED + pas de throw.
 * - Throw inattendu dans resend.emails.send : MessageLog FAILED + pas de throw.
 * - appointmentId absent → null dans le log.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";

// vi.hoisted garantit que les mocks sont disponibles AVANT le hoisting de vi.mock
const { mockEmailSend, mockMessageLogCreate } = vi.hoisted(() => ({
  mockEmailSend: vi.fn(),
  mockMessageLogCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock("resend", () => ({
  Resend: function ResendMock() {
    return { emails: { send: mockEmailSend } };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { messageLog: { create: mockMessageLogCreate } },
}));

const { sendEmail } = await import("@/lib/email/client");

describe("sendEmail", () => {
  const baseOptions = {
    to: "patient@test.com",
    subject: "Test",
    react: createElement("div", null, "test"),
    appointmentId: "appt-id-123",
    type: "CONFIRMATION" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageLogCreate.mockResolvedValue({});
  });

  it("crée un MessageLog EMAIL SENT avec le providerMessageId en cas de succès", async () => {
    mockEmailSend.mockResolvedValueOnce({ data: { id: "msg-abc" }, error: null });

    await sendEmail(baseOptions);

    expect(mockMessageLogCreate).toHaveBeenCalledWith({
      data: {
        appointmentId: "appt-id-123",
        channel: "EMAIL",
        to: "patient@test.com",
        type: "CONFIRMATION",
        status: "SENT",
        providerMessageId: "msg-abc",
      },
    });
  });

  it("crée un MessageLog FAILED si Resend retourne une erreur, sans throw", async () => {
    mockEmailSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid API key" },
    });

    await expect(sendEmail(baseOptions)).resolves.toBeUndefined();

    expect(mockMessageLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        channel: "EMAIL",
        status: "FAILED",
        error: "Invalid API key",
      }),
    });
  });

  it("crée un MessageLog FAILED si resend.emails.send throw, sans throw", async () => {
    mockEmailSend.mockRejectedValueOnce(new Error("Network error"));

    await expect(sendEmail(baseOptions)).resolves.toBeUndefined();

    expect(mockMessageLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        channel: "EMAIL",
        status: "FAILED",
        error: "Network error",
      }),
    });
  });

  it("ne throw pas même si MessageLog.create échoue également", async () => {
    mockEmailSend.mockRejectedValueOnce(new Error("Network error"));
    mockMessageLogCreate.mockRejectedValueOnce(new Error("DB down"));

    await expect(sendEmail(baseOptions)).resolves.toBeUndefined();
  });

  it("utilise appointmentId null quand non fourni", async () => {
    mockEmailSend.mockResolvedValueOnce({ data: { id: "msg-xyz" }, error: null });
    const { appointmentId: _omit, ...optionsWithoutId } = baseOptions;

    await sendEmail(optionsWithoutId);

    expect(mockMessageLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ appointmentId: null }),
    });
  });
});
