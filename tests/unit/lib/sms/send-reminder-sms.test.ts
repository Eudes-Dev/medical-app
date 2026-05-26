// @vitest-environment node
/**
 * Tests unitaires de `lib/sms/send-reminder-sms` (story 6.3, Task 5 + QA DEAD-PARAM-001).
 *
 * Vérifie :
 *  - type REMINDER_D1 / REMINDER_H2 et destinataire corrects
 *  - le body contient le lien d'opt-out (STOP) avec le token (cohérence CNIL 6.2)
 *  - le prénom du patient est repris dans le body (personnalisation)
 *  - pas de fallback email (le rappel email est envoyé en parallèle)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendSms } = vi.hoisted(() => ({ mockSendSms: vi.fn() }));

vi.mock("@/lib/sms/client", () => ({ sendSms: mockSendSms }));

const { sendReminderD1Sms, sendReminderH2Sms } = await import(
  "@/lib/sms/send-reminder-sms"
);

describe("send-reminder-sms", () => {
  const baseParams = {
    appointmentId: "appt-1",
    patientPhone: "+33612345678",
    patientFirstName: "Alice",
    appointmentDate: new Date("2026-06-15T09:00:00Z"),
    optOutToken: "optout-xyz",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendSms.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
  });

  it("sendReminderD1Sms : type REMINDER_D1, prénom et lien d'opt-out dans le body", async () => {
    await sendReminderD1Sms(baseParams);

    expect(mockSendSms).toHaveBeenCalledOnce();
    const call = mockSendSms.mock.calls[0][0];
    expect(call.to).toBe("+33612345678");
    expect(call.type).toBe("REMINDER_D1");
    expect(call.appointmentId).toBe("appt-1");
    expect(call.body).toContain("Alice");
    expect(call.body).toContain(
      "https://example.test/unsubscribe?token=optout-xyz",
    );
  });

  it("sendReminderH2Sms : type REMINDER_H2 et lien d'opt-out présent", async () => {
    await sendReminderH2Sms(baseParams);

    const call = mockSendSms.mock.calls[0][0];
    expect(call.type).toBe("REMINDER_H2");
    expect(call.body).toContain("/unsubscribe?token=optout-xyz");
  });

  it("ne définit pas de fallback email (rappel = complément de l'email)", async () => {
    await sendReminderD1Sms(baseParams);

    const call = mockSendSms.mock.calls[0][0];
    expect(call.fallbackEmail).toBeUndefined();
    expect(call.fallbackEmailFactory).toBeUndefined();
  });
});
