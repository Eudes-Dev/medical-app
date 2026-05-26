// @vitest-environment node
/**
 * Tests unitaires de `lib/sms/send-confirmation-sms` (story 6.3, Task 5).
 *
 * Vérifie :
 *  - sendSms est appelé avec le bon body, type CONFIRMATION et destinataire
 *  - le fallbackEmailFactory est défini quand patientEmail est fourni
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendSms, mockSendConfirmationEmail } = vi.hoisted(() => ({
  mockSendSms: vi.fn(),
  mockSendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sms/client", () => ({ sendSms: mockSendSms }));
vi.mock("@/lib/email/send-confirmation", () => ({
  sendConfirmationEmail: mockSendConfirmationEmail,
}));

const { sendConfirmationSms } = await import("@/lib/sms/send-confirmation-sms");

describe("sendConfirmationSms", () => {
  const baseParams = {
    appointmentId: "appt-1",
    patientPhone: "+33612345678",
    patientFirstName: "Jean",
    appointmentDate: new Date("2026-06-15T09:00:00Z"),
    appointmentType: "Première consultation",
    cancellationToken: "tok-abc",
    cabinetSlug: "cabinet",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendSms.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
  });

  it("appelle sendSms avec type CONFIRMATION et le bon destinataire", async () => {
    await sendConfirmationSms(baseParams);

    expect(mockSendSms).toHaveBeenCalledOnce();
    const call = mockSendSms.mock.calls[0][0];
    expect(call.to).toBe("+33612345678");
    expect(call.type).toBe("CONFIRMATION");
    expect(call.appointmentId).toBe("appt-1");
    expect(call.body).toContain("Cabinet Médical");
    expect(call.body).toContain("tok-abc");
    // QA UX-001 : statut PENDING → « enregistré », pas « confirmé ».
    expect(call.body).toContain("enregistré");
    expect(call.body).not.toContain("confirmé");
  });

  it("ne définit pas de fallback quand patientEmail est absent", async () => {
    await sendConfirmationSms(baseParams);

    const call = mockSendSms.mock.calls[0][0];
    expect(call.fallbackEmail).toBeUndefined();
    expect(call.fallbackEmailFactory).toBeUndefined();
  });

  it("définit le fallbackEmailFactory quand patientEmail est fourni", async () => {
    await sendConfirmationSms({ ...baseParams, patientEmail: "patient@test.com" });

    const call = mockSendSms.mock.calls[0][0];
    expect(call.fallbackEmail).toBe("patient@test.com");
    expect(typeof call.fallbackEmailFactory).toBe("function");

    // Le factory appelle bien sendConfirmationEmail
    await call.fallbackEmailFactory();
    expect(mockSendConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: "appt-1",
        patientEmail: "patient@test.com",
        cancellationToken: "tok-abc",
      }),
    );
  });
});
