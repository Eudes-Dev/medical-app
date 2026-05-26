"use server";

import { prisma } from "@/lib/prisma";

export async function optOutReminders(
  token: string
): Promise<{ success: boolean }> {
  try {
    await prisma.patient.update({
      where: { optOutToken: token },
      data: { reminderOptOut: true },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
