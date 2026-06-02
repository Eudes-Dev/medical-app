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

interface ConfirmationEmailProps {
  patientFirstName: string;
  appointmentDate: Date;
  appointmentType: string;
  cancellationToken: string;
  cabinetSlug: string;
  cabinet: CabinetEmailInfo;
}

export function ConfirmationEmail({
  patientFirstName,
  appointmentDate,
  appointmentType,
  cancellationToken,
  cabinetSlug,
  cabinet,
}: ConfirmationEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cancellationUrl = `${appUrl}/${cabinetSlug}/book/cancel?token=${cancellationToken}`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>Confirmation de votre rendez-vous — {cabinet.name}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <Heading style={{ color: "#111827", fontSize: "24px" }}>
            Votre rendez-vous est confirmé
          </Heading>

          <Text style={{ color: "#374151" }}>
            Bonjour {patientFirstName},
          </Text>
          <Text style={{ color: "#374151" }}>
            Votre rendez-vous a bien été enregistré. Voici le récapitulatif :
          </Text>

          <Section style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "16px", border: "1px solid #e5e7eb" }}>
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

          <Text style={{ color: "#6b7280", fontSize: "14px", marginTop: "24px" }}>
            Si vous souhaitez annuler ce rendez-vous, cliquez sur le lien ci-dessous :
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

export default ConfirmationEmail;
