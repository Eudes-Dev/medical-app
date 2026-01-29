"use client";

/**
 * Wrapper pour la librairie de toasts `sonner`.
 *
 * - Expose le composant `Toaster` à utiliser dans le layout racine
 * - Ré-exporte `toast` pour une utilisation cohérente dans l'application
 *
 * Exemple d'utilisation (layout):
 *
 * ```tsx
 * import { Toaster } from "@/components/ui/sonner";
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html lang="fr">
 *       <body>
 *         {children}
 *         <Toaster />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

import { Toaster as SonnerToaster, toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand
      theme="system"
    />
  );
}

export { toast };

