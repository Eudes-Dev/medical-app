// @vitest-environment node
/**
 * Tests unitaires de `lib/email/send-reschedule` (story 8.1).
 *
 * Vérifie :
 * - sendEmail est appelé avec le bon destinataire, sujet et type RESCHEDULED.
 * - Le template React reçoit les bonnes props (nouvelle date + token + slug).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({ sendEmail: mockSendEmail }));

const CABINET = { name: "Cabinet Test", address: "1 rue Test", phone: "01 00 00 00 00" };
vi.mock("@/lib/email/cabinet-info", () => ({
  getCabinetEmailInfo: vi.fn().mockResolvedValue(CABINET),
}));

const { sendRescheduleEmail } = await import("@/lib/email/send-reschedule");

describe("sendRescheduleEmail", () => {
  const params = {
    appointmentId: "appt-789",
    patientEmail: "marie.durand@test.com",
    patientFirstName: "Marie",
    appointmentDate: new Date("2026-06-20T08:30:00Z"),
    appointmentType: "Consultation de suivi",
    cancellationToken: "tok-xyz",
    cabinetSlug: "cabinet",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("appelle sendEmail avec le bon destinataire, sujet et type RESCHEDULED", async () => {
    await sendRescheduleEmail(params);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("marie.durand@test.com");
    expect(call.subject).toBe("Votre rendez-vous a été reprogrammé");
    expect(call.type).toBe("RESCHEDULED");
    expect(call.appointmentId).toBe("appt-789");
  });

  it("transmet un élément React (template) avec les bonnes props", async () => {
    await sendRescheduleEmail(params);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.react).toBeTruthy();
    expect(call.react.props).toMatchObject({
      patientFirstName: "Marie",
      appointmentType: "Consultation de suivi",
      cancellationToken: "tok-xyz",
      cabinetSlug: "cabinet",
      cabinet: CABINET,
    });
  });

  it("résout sans valeur de retour en cas de succès", async () => {
    await expect(sendRescheduleEmail(params)).resolves.toBeUndefined();
  });
});
