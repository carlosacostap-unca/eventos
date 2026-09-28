import { requireAdmin } from "@/lib/auth/session";

export default async function EventTypesLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
