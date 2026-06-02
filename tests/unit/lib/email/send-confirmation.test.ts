// @vitest-environment node
/**
 * Tests unitaires de `lib/email/send-confirmation` (Story 6.1).
 *
 * Vérifie :
 * - sendEmail est appelé avec les bonnes props (to, subject, type, appointmentId).
 * - Le template React reçoit les bonnes props.
 *
 * Note : la garantie fire-and-forget (pas de throw côté client) est assurée
 * par `sendEmail` lui-même (lib/email/client.ts) et par le `.catch()` dans
 * les Server Actions. Ce helper fait simplement le pont vers sendEmail.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({ sendEmail: mockSendEmail }));

// Story 7.4 : la couche d'envoi lit le profil cabinet (props injectées aux
// templates). Mock du lecteur pour éviter tout accès Prisma en test unitaire.
const CABINET = { name: "Cabinet Test", address: "1 rue Test", phone: "01 00 00 00 00" };
vi.mock("@/lib/email/cabinet-info", () => ({
  getCabinetEmailInfo: vi.fn().mockResolvedValue(CABINET),
}));

const { sendConfirmationEmail } = await import("@/lib/email/send-confirmation");

describe("sendConfirmationEmail", () => {
  const params = {
    appointmentId: "appt-123",
    patientEmail: "jean.dupont@test.com",
    patientFirstName: "Jean",
    appointmentDate: new Date("2026-06-01T10:00:00Z"),
    appointmentType: "Première consultation",
    cancellationToken: "token-uuid-abc",
    cabinetSlug: "cabinet",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("appelle sendEmail avec le bon destinataire, sujet et type CONFIRMATION", async () => {
    await sendConfirmationEmail(params);

    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0][0];
    expect(call.to).toBe("jean.dupont@test.com");
    expect(call.subject).toBe("Confirmation de votre rendez-vous");
    expect(call.type).toBe("CONFIRMATION");
    expect(call.appointmentId).toBe("appt-123");
  });

  it("transmet un élément React (template) à sendEmail avec les bonnes props", async () => {
    await sendConfirmationEmail(params);

    const call = mockSendEmail.mock.calls[0][0];
    expect(call.react).toBeTruthy();
    expect(call.react.props).toMatchObject({
      patientFirstName: "Jean",
      cancellationToken: "token-uuid-abc",
      cabinetSlug: "cabinet",
      appointmentType: "Première consultation",
      cabinet: CABINET,
    });
  });

  it("résout sans valeur de retour en cas de succès", async () => {
    await expect(sendConfirmationEmail(params)).resolves.toBeUndefined();
  });
});
