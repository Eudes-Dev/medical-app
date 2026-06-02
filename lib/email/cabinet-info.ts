/**
 * Lecture des coordonnées du cabinet pour les e-mails transactionnels (story 7.4).
 *
 * La couche d'envoi (`send-*.ts`) lit le profil persisté (`CabinetProfile`) et le
 * passe en props aux templates React Email — qui n'importent donc plus
 * `CABINET_INFO`. Repli sur `CABINET_INFO` si la table profil est vide (AC 5/6),
 * pour garantir des e-mails cohérents avec la landing publique.
 *
 * @module lib/email/cabinet-info
 */

import { prisma } from "@/lib/prisma";
import { CABINET_INFO } from "@/lib/cabinet/config";

/** Coordonnées du cabinet injectées dans les templates d'e-mail. */
export interface CabinetEmailInfo {
  name: string;
  address: string;
  phone: string;
}

/**
 * Renvoie les coordonnées du cabinet pour les e-mails, depuis le profil persisté
 * avec repli sur `CABINET_INFO` (table profil vide au premier déploiement).
 */
export async function getCabinetEmailInfo(): Promise<CabinetEmailInfo> {
  const profile = await prisma.cabinetProfile.findFirst({
    select: { name: true, address: true, phone: true },
  });
  return {
    name: profile?.name ?? CABINET_INFO.name,
    address: profile?.address ?? CABINET_INFO.address,
    phone: profile?.phone ?? CABINET_INFO.phone,
  };
}
