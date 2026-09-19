import Image from "next/image";

import type { SpeakerRecord } from "@/lib/domain/models";

export function SpeakerCard({
  speaker,
  unoptimized = false,
}: {
  speaker: SpeakerRecord;
  unoptimized?: boolean;
}) {
  return (
    <article className="speaker-card">
      <Image
        className="speaker-photo"
        src={"/api/disertantes/" + speaker.id + "/foto?v=" + encodeURIComponent(speaker.updated)}
        alt={"Foto de " + speaker.titulo + " " + speaker.nombre}
        width={116}
        height={116}
        unoptimized={unoptimized}
      />
      <div>
        <p className="speaker-title">{speaker.titulo}</p>
        <h3>{speaker.nombre}</h3>
        <p className="speaker-universities">{speaker.universidades}</p>
      </div>
    </article>
  );
}
