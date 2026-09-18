"use server";

import { ClientResponseError } from "pocketbase";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/actions/state";
import { clearSession, setSession } from "@/lib/auth/session";
import { loginInputSchema } from "@/lib/domain/models";
import { getServerEnv } from "@/lib/env";
import { createServicePocketBase } from "@/lib/pocketbase/client";
import { createPocketBaseClient } from "@/lib/pocketbase/factory";

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
  try {
    await client
      .collection("_superusers")
      .authWithPassword(parsed.data.email, parsed.data.password);

    const service = await createServicePocketBase();
    const administrator = await service
      .collection("administradores")
      .getFirstListItem(
        service.filter("email = {:email}", { email: parsed.data.email }),
      );

    await setSession({
      adminId: administrator.id,
      email: String(administrator.email),
      name: String(administrator.nombre || administrator.email),
    });
  } catch (error) {
    if (
      error instanceof ClientResponseError &&
      (error.status === 400 || error.status === 401 || error.status === 404)
    ) {
      return { message: "El email o la contraseña no son correctos." };
    }
    return { message: "No pudimos iniciar sesión. Intentá nuevamente." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/iniciar-sesion");
}
