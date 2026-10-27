import { notFound } from "next/navigation";
import { QuickAccreditation } from "@/components/quick-accreditation";
import { requireEventAccess } from "@/lib/auth/event-access";
import { isCapacityFull } from "@/lib/domain/events";
import { getEventById } from "@/lib/services/events";
import { publicModalities } from "@/lib/services/modalities";
import { countOccupiedPlaces, countPublicRegistrations } from "@/lib/services/registrations";

export default async function AccreditationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireEventAccess(id, "accredit");
  const event = await getEventById(id);
  if (!event) notFound();
  const canManage = access.eventRole === "administrador_evento";
  const [modes, count] = await Promise.all([publicModalities(event), canManage ? countPublicRegistrations(id) : countOccupiedPlaces(id)]);
  return <QuickAccreditation key={id} eventId={id} eventTitle={event.titulo} modes={modes} isFull={isCapacityFull(event, count)} canManage={canManage} />;
}
