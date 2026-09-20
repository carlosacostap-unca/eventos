import type PocketBase from "pocketbase";
import { describe, expect, it } from "vitest";

import { migrateSpeakerLinks } from "@/lib/pocketbase/migrate-speaker-links";

describe("migración de disertantes", () => {
  it("conserva vínculos existentes y no recrea uno quitado al ejecutar el esquema otra vez", async () => {
    const speakers = [
      { id: "speaker1", evento: "event1", vinculos_migrados: false },
      { id: "speaker2", evento: "event2", vinculos_migrados: false },
    ];
    const links = [{ evento: "event1", disertante: "speaker1" }];
    const pb = {
      collection(name: string) {
        if (name === "disertantes") {
          return {
            getFullList: async () => speakers.map((speaker) => ({ ...speaker })),
            update: async (id: string, data: { vinculos_migrados: boolean }) => {
              const speaker = speakers.find((item) => item.id === id);
              if (speaker) speaker.vinculos_migrados = data.vinculos_migrados;
            },
          };
        }
        return {
          getFullList: async () => links.map((link) => ({ ...link })),
          create: async (link: { evento: string; disertante: string }) => {
            links.push(link);
          },
        };
      },
    } as unknown as PocketBase;

    expect(await migrateSpeakerLinks(pb)).toBe(1);
    expect(links).toEqual([
      { evento: "event1", disertante: "speaker1" },
      { evento: "event2", disertante: "speaker2" },
    ]);
    expect(speakers.every((speaker) => speaker.vinculos_migrados)).toBe(true);

    links.pop();
    expect(await migrateSpeakerLinks(pb)).toBe(0);
    expect(links).toEqual([{ evento: "event1", disertante: "speaker1" }]);
  });
});
