import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Link,
  Preview,
  Section,
} from "@react-email/components";
import type { CabinetEmailInfo } from "@/lib/email/cabinet-info";
import { formatDate } from "./format";

interface RescheduleEmailProps {
  patientFirstName: string;
  /** Nouvelle date/heure du rendez-vous. */
  appointmentDate: Date;
  appointmentType: string;
  /** Jeton de gestion opaque (réutilise `cancellationToken`, story 6.1/8.1). */
  cancellationToken: string;
  cabinetSlug: string;
  cabinet: CabinetEmailInfo;
}

export function RescheduleEmail({
  patientFirstName,
  appointmentDate,
  appointmentType,
  cancellationToken,
  cabinetSlug,
  cabinet,
}: RescheduleEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const rescheduleUrl = `${appUrl}/${cabinetSlug}/book/reschedule?token=${cancellationToken}`;
  const cancellationUrl = `${appUrl}/${cabinetSlug}/book/cancel?token=${cancellationToken}`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre rendez-vous a été reprogrammé — {cabinet.name}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#111827", fontSize: "24px" }}>
            Votre rendez-vous a été reprogrammé
          </Heading>

          <Text style={{ color: "#374151" }}>
            Bonjour {patientFirstName},
          </Text>
          <Text style={{ color: "#374151" }}>
            Votre rendez-vous a bien été déplacé. Voici le nouveau récapitulatif :
          </Text>

          <Section style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "16px", border: "1px solid #e5e7eb" }}>
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Nouvelle date et heure :</strong> {formatDate(appointmentDate)}
            </Text>
            <Text style={{ margin: "0", color: "#374151" }}>
              <strong>Type de consultation :</strong> {appointmentType}
            </Text>
          </Section>

          <Text style={{ color: "#6b7280", fontSize: "14px", marginTop: "24px" }}>
            Besoin d&apos;un autre créneau ? Vous pouvez reprogrammer à nouveau :
          </Text>
          <Link href={rescheduleUrl} style={{ color: "#2563eb", fontSize: "14px" }}>
            Reprogrammer mon rendez-vous
          </Link>

          <Text style={{ color: "#6b7280", fontSize: "14px", marginTop: "16px" }}>
            Vous ne pourrez pas venir ? Annulez votre rendez-vous :
          </Text>
          <Link href={cancellationUrl} style={{ color: "#dc2626", fontSize: "14px" }}>
            Annuler mon rendez-vous
          </Link>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />
          <Text style={{ color: "#9ca3af", fontSize: "12px" }}>
            {cabinet.name} — {cabinet.address} — {cabinet.phone}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RescheduleEmail;
