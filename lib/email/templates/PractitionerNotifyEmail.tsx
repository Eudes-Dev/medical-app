import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Preview,
  Section,
} from "@react-email/components";
import { CABINET_INFO } from "@/lib/cabinet/config";
import { formatDate } from "./format";

interface PractitionerNotifyEmailProps {
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  patientEmail?: string;
  appointmentDate: Date;
  appointmentType: string;
}

export function PractitionerNotifyEmail({
  patientFirstName,
  patientLastName,
  patientPhone,
  patientEmail,
  appointmentDate,
  appointmentType,
}: PractitionerNotifyEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Nouveau RDV — {patientFirstName} {patientLastName} le{" "}
        {formatDate(appointmentDate)}
      </Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#111827", fontSize: "24px" }}>
            Nouveau rendez-vous reçu
          </Heading>

          <Text style={{ color: "#374151" }}>
            Un nouveau rendez-vous a été réservé via le tunnel public.
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
              <strong>Patient :</strong> {patientFirstName} {patientLastName}
            </Text>
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Téléphone :</strong> {patientPhone}
            </Text>
            {patientEmail && (
              <Text style={{ margin: "0 0 8px", color: "#374151" }}>
                <strong>Email :</strong> {patientEmail}
              </Text>
            )}
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
            {CABINET_INFO.name} — {CABINET_INFO.address}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PractitionerNotifyEmail;
