/**
 * Page de connexion praticien
 *
 * Cette page affiche le formulaire de connexion pour les praticiens.
 * Accessible publiquement à l'URL /login.
 *
 * Route: /login
 *
 * @module app/(auth)/login/page
 */

import { LoginForm } from "@/components/auth/login-form";

/**
 * Métadonnées de la page de connexion.
 */
export const metadata = {
  title: "Connexion | Medical App",
  description: "Connectez-vous à votre espace praticien",
};

/**
 * Page de connexion.
 *
 * Affiche le formulaire de connexion encapsulé dans une Card.
 *
 * @returns La page de connexion
 */
export default function LoginPage() {
  return <LoginForm />;
}
