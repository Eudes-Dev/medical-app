"use client";

/**
 * Helpers de toasts centralisés (story 5.1, AC 7).
 *
 * Les composants applicatifs doivent passer par ces fonctions plutôt que
 * d'importer `toast` depuis `sonner` directement. Cela garantit un mapping
 * unique error → message FR et évite la duplication de chaînes.
 */

import { toast } from "@/components/ui/sonner";

type ToastOptions = {
  description?: string;
};

export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, options);
}

export function showError(message: string, options?: ToastOptions) {
  return toast.error(message, options);
}

export function showInfo(message: string, options?: ToastOptions) {
  return toast.info(message, options);
}

export function showWarning(message: string, options?: ToastOptions) {
  return toast.warning(message, options);
}
