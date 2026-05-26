// @vitest-environment node
/**
 * Tests unitaires de `lib/email/send-cancellation` (Story 6.1).
 *
 * Vérifie :
 * - sendEmail est appelé avec le bon destinataire, sujet et type CANCELLATION.
 * - Le template React reçoit les bonnes props.
 * - La fonction résout sans valeur de retour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({ sendEmail: mockSendEmail }));

const { sendCancellationEmail } = await import("@/lib/email/send-cancellation");

describe("sendCancellationEmail", () => {
  const params = {
    appointmentId: "appt-456",
    patientEmail: "marie.durand@test.com",
    patientFirstName: "Marie",
    appointmentDate: new Date("2026-06-10T14:00:00Z"),
    appointmentType: "Consultation de suivi",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("appelle sendEmail avec le bon destinataire, sujet et type CANCELLATION", async () => {
    await sendCancellationEmail(params);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("marie.durand@test.com");
    expect(call.subject).toBe("Annulation de votre rendez-vous");
    expect(call.type).toBe("CANCELLATION");
    expect(call.appointmentId).toBe("appt-456");
  });

  it("transmet un élément React (template) avec les bonnes props", async () => {
    await sendCancellationEmail(params);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.react).toBeTruthy();
    expect(call.react.props).toMatchObject({
      patientFirstName: "Marie",
      appointmentType: "Consultation de suivi",
    });
  });

  it("résout sans valeur de retour en cas de succès", async () => {
    await expect(sendCancellationEmail(params)).resolves.toBeUndefined();
  });
});
