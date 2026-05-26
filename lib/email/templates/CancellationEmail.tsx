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

interface CancellationEmailProps {
  patientFirstName: string;
  appointmentDate: Date;
  appointmentType: string;
}

export function CancellationEmail({
  patientFirstName,
  appointmentDate,
  appointmentType,
}: CancellationEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Annulation de votre rendez-vous — {CABINET_INFO.name}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#111827", fontSize: "24px" }}>
            Votre rendez-vous a été annulé
          </Heading>

          <Text style={{ color: "#374151" }}>
            Bonjour {patientFirstName},
          </Text>
          <Text style={{ color: "#374151" }}>
            Nous vous confirmons l&apos;annulation du rendez-vous suivant :
          </Text>

          <Section style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "16px", border: "1px solid #e5e7eb" }}>
            <Text style={{ margin: "0 0 8px", color: "#374151" }}>
              <strong>Date et heure :</strong> {formatDate(appointmentDate)}
            </Text>
            <Text style={{ margin: "0", color: "#374151" }}>
              <strong>Type de consultation :</strong> {appointmentType}
            </Text>
          </Section>

          <Text style={{ color: "#374151", marginTop: "24px" }}>
            Si vous souhaitez prendre un nouveau rendez-vous, n&apos;hésitez pas à nous contacter au{" "}
            <strong>{CABINET_INFO.phone}</strong>.
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />
          <Text style={{ color: "#9ca3af", fontSize: "12px" }}>
            {CABINET_INFO.name} — {CABINET_INFO.address} — {CABINET_INFO.phone}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default CancellationEmail;
