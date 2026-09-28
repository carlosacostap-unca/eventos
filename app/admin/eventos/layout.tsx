import { requireAdmin } from "@/lib/auth/session";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
