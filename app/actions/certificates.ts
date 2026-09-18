"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import {
  generateCertificates,
  requeueDelivery,
} from "@/lib/services/certificates";

export async function generateCertificatesAction(eventId: string) {
  const admin = await requireAdmin();
  const result = await generateCertificates(eventId, admin.adminId);
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

export async function requeueDeliveryAction(formData: FormData) {
  const admin = await requireAdmin();
  const deliveryId = String(formData.get("deliveryId") || "");
  const eventId = String(formData.get("eventId") || "");
  if (!deliveryId || !eventId) return;
  await requeueDelivery(deliveryId, admin.adminId);
  revalidatePath("/admin/eventos/" + eventId + "/certificados");
}
