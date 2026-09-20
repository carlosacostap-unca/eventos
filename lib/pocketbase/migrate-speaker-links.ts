import type PocketBase from "pocketbase";

export async function migrateSpeakerLinks(pb: PocketBase): Promise<number> {
  const [speakers, links] = await Promise.all([
    pb.collection("disertantes").getFullList({ fields: "id,evento,vinculos_migrados" }),
    pb.collection("participaciones_disertantes").getFullList({
      fields: "evento,disertante",
    }),
  ]);
  const existing = new Set(links.map((link) => `${link.evento}:${link.disertante}`));
  let created = 0;

  for (const speaker of speakers) {
    if (speaker.vinculos_migrados) continue;
    if (speaker.evento && !existing.has(`${speaker.evento}:${speaker.id}`)) {
      await pb.collection("participaciones_disertantes").create({
        evento: speaker.evento,
        disertante: speaker.id,
      });
      existing.add(`${speaker.evento}:${speaker.id}`);
      created += 1;
    }
    await pb.collection("disertantes").update(speaker.id, { vinculos_migrados: true });
  }

  return created;
}
