import { AdminLogin } from "@/components/admin-login";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

export const metadata = { title: "Acceso administrativo" };

export default async function LoginPage() {
  const admin = await getAuthenticatedAdmin();
  return <AdminLogin authenticated={Boolean(admin)} />;
}
