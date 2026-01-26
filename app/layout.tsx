/**
 * Layout racine de l'application médicale.
 *
 * Ce layout est le point d'entrée de toute l'application Next.js.
 * Il définit:
 * - Les métadonnées globales (title, description)
 * - Les polices de caractères (Geist Sans/Mono)
 * - La structure HTML de base
 *
 * @module app/layout
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Police Geist Sans pour le texte principal.
 * Moderne, lisible et adaptée aux interfaces médicales.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Police Geist Mono pour le code et les données techniques.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Métadonnées globales de l'application.
 *
 * Ces métadonnées sont utilisées pour le SEO et l'affichage
 * dans les onglets du navigateur.
 */
export const metadata: Metadata = {
  title: {
    default: "Medical App - Gestion de Cabinet Médical",
    template: "%s | Medical App",
  },
  description:
    "Application de gestion de cabinet médical single-tenant avec prise de rendez-vous en ligne pour les patients et tableau de bord pour les praticiens.",
  keywords: [
    "médecin",
    "rendez-vous",
    "cabinet médical",
    "gestion patients",
    "prise de rendez-vous",
  ],
  authors: [{ name: "Medical App Team" }],
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Props du layout racine.
 */
interface RootLayoutProps {
  /** Contenu de la page (children) */
  children: ReactNode;
}

/**
 * Layout racine de l'application.
 *
 * Encapsule toutes les pages avec:
 * - Structure HTML valide
 * - Polices de caractères
 * - Styles globaux (TailwindCSS)
 *
 * @param props - Props contenant les children
 * @returns Le layout HTML complet
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
