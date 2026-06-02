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

interface ReminderH2EmailProps {
  patientFirstName: string;
  appointmentDate: Date;
  appointmentType: string;
  optOutToken: string;
  cabinet: CabinetEmailInfo;
}

export function ReminderH2Email({
  patientFirstName,
  appointmentDate,
  appointmentType,
  optOutToken,
  cabinet,
}: ReminderH2EmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const unsubscribeUrl = `${appUrl}/unsubscribe?token=${optOutToken}`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>Rappel : votre rendez-vous dans 2h — {cabinet.name}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#111827", fontSize: "24px" }}>
            Votre rendez-vous est dans 2 heures
          </Heading>

          <Text style={{ color: "#374151" }}>Bonjour {patientFirstName},</Text>
          <Text style={{ color: "#374151" }}>
            Votre rendez-vous approche ! Voici le récapitulatif :
          </Text>

          <Section
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Cabinet :</strong> {cabinet.name}
            </Text>
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Adresse :</strong> {cabinet.address}
            </Text>
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Téléphone :</strong> {cabinet.phone}
            </Text>
            <Hr style={{ borderColor: "#e5e7eb", margin: "12px 0" }} />
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Date et heure :</strong> {formatDate(appointmentDate)}
            </Text>
            <Text style={{ margin: "0", color: "#374151" }}>
              <strong>Type de consultation :</strong> {appointmentType}
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />
          <Text style={{ color: "#9ca3af", fontSize: "12px" }}>
            Pour ne plus recevoir ces rappels :{" "}
            <Link href={unsubscribeUrl} style={{ color: "#6b7280" }}>
              Se désabonner
            </Link>
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: "12px" }}>
            {cabinet.name} — {cabinet.address} — {cabinet.phone}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReminderH2Email;
