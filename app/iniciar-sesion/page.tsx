import { AdminLogin } from "@/components/admin-login";
import { getAuthenticatedStaff } from "@/lib/auth/session";

export const metadata = { title: "Acceso administrativo" };

export default async function LoginPage() {
  const admin = await getAuthenticatedStaff();
  return <AdminLogin authenticated={Boolean(admin)} />;
}
