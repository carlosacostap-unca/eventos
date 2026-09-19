"use server";

import { ClientResponseError, type RecordModel } from "pocketbase";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/actions/state";
import { clearSession, setSession } from "@/lib/auth/session";
import { loginInputSchema } from "@/lib/domain/models";
import { getServerEnv } from "@/lib/env";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { createPocketBaseClient } from "@/lib/pocketbase/factory";

const setupMessage =
  "El acceso administrativo no está configurado en PocketBase. Revisá la conexión y ejecutá la preparación del esquema.";

function isRejectedCredentials(error: unknown) {
  return (
    error instanceof ClientResponseError &&
    (error.status === 400 || error.status === 401 || error.status === 404)
  );
}

export async function loginAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fields: parsed.error.flatten().fieldErrors };
  }

  const env = getServerEnv();
  const client = createPocketBaseClient(env.POCKETBASE_URL);
  let administrator: RecordModel | null = null;

  try {
    const result = await client
      .collection("administradores")
      .authWithPassword(parsed.data.email, parsed.data.password);
    administrator = result.record;
  } catch (error) {
    if (!isRejectedCredentials(error)) {
      return { message: "No pudimos conectar con PocketBase. Intentá nuevamente." };
    }

    try {
      await client
        .collection("_superusers")
        .authWithPassword(parsed.data.email, parsed.data.password);
    } catch (superuserError) {
      return {
        message: isRejectedCredentials(superuserError)
          ? "El email o la contraseña no son correctos."
          : "No pudimos conectar con PocketBase. Intentá nuevamente.",
      };
    }

    try {
      administrator = await client
        .collection("administradores")
        .getFirstListItem(
          client.filter("email = {:email}", { email: parsed.data.email }),
        );
    } catch {
      return { message: setupMessage };
    }
  }

  if (!administrator || administrator.role !== "admin") {
    return { message: "Esta cuenta no tiene acceso al panel." };
  }

  try {
    const service = await createServicePocketBase();
    const visibleAdministrator = await service
      .collection("administradores")
      .getOne(administrator.id, { fields: "id,role" });
    if (
      visibleAdministrator.id !== administrator.id ||
      visibleAdministrator.role !== "admin"
    ) {
      return { message: setupMessage };
    }

    await setSession({
      adminId: administrator.id,
      email: parsed.data.email.trim().toLowerCase(),
      name: String(administrator.nombre || administrator.email),
    });
  } catch {
    return { message: setupMessage };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/iniciar-sesion");
}
