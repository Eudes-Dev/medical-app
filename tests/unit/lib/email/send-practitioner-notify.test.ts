// @vitest-environment node
/**
 * Tests unitaires de `lib/email/send-practitioner-notify` (Story 6.1).
 *
 * Vérifie :
 * - sendEmail est appelé avec le bon destinataire (PRACTITIONER_NOTIFICATION_EMAIL),
 *   le bon sujet et le type PRACTITIONER_NOTIFY.
 * - Le template React reçoit les bonnes props (nom patient, type, date).
 * - Si PRACTITIONER_NOTIFICATION_EMAIL est absent : sendEmail n'est pas appelé.
 * - La fonction résout sans valeur de retour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({ sendEmail: mockSendEmail }));

const { sendPractitionerNotify } = await import(
  "@/lib/email/send-practitioner-notify"
);

describe("sendPractitionerNotify", () => {
  const params = {
    appointmentId: "appt-789",
    patientFirstName: "Jean",
    patientLastName: "Dupont",
    patientPhone: "0612345678",
    patientEmail: "jean.dupont@test.com",
    appointmentDate: new Date("2026-06-15T09:00:00Z"),
    appointmentType: "Première consultation",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
    process.env.PRACTITIONER_NOTIFICATION_EMAIL = "praticien@cabinet.fr";
  });

  it("appelle sendEmail vers PRACTITIONER_NOTIFICATION_EMAIL avec type PRACTITIONER_NOTIFY", async () => {
    await sendPractitionerNotify(params);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("praticien@cabinet.fr");
    expect(call.type).toBe("PRACTITIONER_NOTIFY");
    expect(call.appointmentId).toBe("appt-789");
  });

  it("inclut le nom du patient dans le sujet", async () => {
    await sendPractitionerNotify(params);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.subject).toContain("Jean");
    expect(call.subject).toContain("Dupont");
  });

  it("transmet un élément React avec les bonnes props patient", async () => {
    await sendPractitionerNotify(params);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.react).toBeTruthy();
    expect(call.react.props).toMatchObject({
      patientFirstName: "Jean",
      patientLastName: "Dupont",
      patientPhone: "0612345678",
      appointmentType: "Première consultation",
    });
  });

  it("n'appelle pas sendEmail si PRACTITIONER_NOTIFICATION_EMAIL est absent", async () => {
    delete process.env.PRACTITIONER_NOTIFICATION_EMAIL;

    await sendPractitionerNotify(params);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("résout sans valeur de retour en cas de succès", async () => {
    await expect(sendPractitionerNotify(params)).resolves.toBeUndefined();
  });
});
