import type { NextConfig } from "next";

/**
 * Configuration Next.js 16 pour l'application médicale single-tenant.
 *
 * @description Cette configuration utilise l'App Router et est optimisée
 * pour une application médicale avec:
 * - Espace public: /book/* (réservation patients)
 * - Espace privé: /dashboard/* (interface praticien)
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring
 */
const nextConfig: NextConfig = {
  /**
   * Active le mode strict de React pour détecter les problèmes potentiels
   * pendant le développement (double rendu, effets dépréciés, etc.)
   */
  reactStrictMode: true,

  /**
   * Configuration des images autorisées.
   * À étendre si besoin d'images externes (ex: avatars, photos patients).
   */
  images: {
    remotePatterns: [
      // Ajouter ici les domaines autorisés pour les images distantes
      // Ex: { protocol: 'https', hostname: 'example.com' }
    ],
  },

  /**
   * Headers de sécurité personnalisés.
   * Ces headers seront appliqués à toutes les routes.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
