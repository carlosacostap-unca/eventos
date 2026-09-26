"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import { DomainError } from "@/lib/domain/errors";
import {
  generateCertificates,
} from "@/lib/services/certificates";

export async function generateCertificatesAction(eventId: string) {
  const admin = await requireAdmin();
  let result;
  try {
    result = await generateCertificates(eventId, admin.adminId);
  } catch (error) {
    if (error instanceof DomainError && error.code === "DISABLED") {
      redirect("/admin/eventos/" + eventId + "/certificados?error=deshabilitado");
    }
    throw error;
  }
  revalidatePath("/admin/eventos/" + eventId + "/certificados");
  const query =
    "?created=" +
    result.created +
    "&reused=" +
    result.reused +
    "&eligible=" +
    result.eligible;
  redirect("/admin/eventos/" + eventId + "/certificados" + query);
}
