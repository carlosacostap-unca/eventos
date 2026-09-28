"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/actions/state";
import { requireAdmin } from "@/lib/auth/session";
import {
  CERTIFICATE_TEXT_KEYS,
  certificateTextInputSchema,
} from "@/lib/domain/certificate-texts";
import { DomainError } from "@/lib/domain/errors";
import { offersAttendanceCertificate } from "@/lib/domain/event-details";
import { audit } from "@/lib/services/audit";
import { generateCertificates } from "@/lib/services/certificates";
import { getEventById, updateCertificateTexts } from "@/lib/services/events";

function certificateTextsFromForm(formData: FormData) {
  return Object.fromEntries(
    CERTIFICATE_TEXT_KEYS.map((key) => [key, formData.get(key)]),
  );
}

export async function saveCertificateTextsAction(
  eventId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = certificateTextInputSchema.safeParse(
    certificateTextsFromForm(formData),
  );
  if (!parsed.success) return { fields: parsed.error.flatten().fieldErrors };

  try {
    const event = await getEventById(eventId);
    if (!event) return { message: "El evento ya no existe." };
    if (!offersAttendanceCertificate(event)) {
      return { message: "Este evento no entrega certificados de asistencia." };
    }
    await updateCertificateTexts(eventId, parsed.data);
    await audit({
      adminId: admin.adminId,
      action: "certificado.textos_actualizados",
      entity: "evento",
      entityId: eventId,
      data: { secciones: CERTIFICATE_TEXT_KEYS },
    });
  } catch {
    return { message: "No se pudieron guardar los textos. Intentá nuevamente." };
  }

  revalidatePath("/admin/eventos/" + eventId + "/certificados");
  return {
    ok: true,
    message: "Los textos del certificado se guardaron correctamente.",
  };
}

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
