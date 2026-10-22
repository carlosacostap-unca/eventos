import { requireStaff } from "@/lib/auth/session";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return children;
}
