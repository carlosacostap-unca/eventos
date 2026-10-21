import "server-only";
import type PocketBase from "pocketbase";
import { ClientResponseError } from "pocketbase";
import { recordId } from "@/lib/domain/fingerprints";
import { DomainError } from "@/lib/domain/errors";

// Un índice único coordina procesos y réplicas; nunca se confía en un mutex en memoria.
export async function withOperationLock<T>(pb: PocketBase, key: string, run: (assertOwned: () => Promise<void>) => Promise<T>): Promise<T> {
  const owner = recordId();
  let lockId = "";
  const deadline = Date.now() + 15000;
  while (!lockId && Date.now() < deadline) {
    try {
      const lock = await pb.collection("bloqueos_operacion").create({ clave: key, propietario: owner, vence: new Date(Date.now() + 10 * 60000).toISOString() });
      lockId = lock.id;
    } catch (error) {
      if (!(error instanceof ClientResponseError) || error.status !== 400) throw error;
      const records = await pb.collection("bloqueos_operacion").getFullList({ filter: pb.filter("clave = {:key}", { key }) });
      const previous = records[0];
      if (previous && new Date(previous.vence).getTime() < Date.now()) {
        try { await pb.collection("bloqueos_operacion").delete(previous.id); } catch (e) { if (!(e instanceof ClientResponseError) || e.status !== 404) throw e; }
      } else await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!lockId) throw new DomainError("INVALID", "Hay otra operación en curso. Intentá nuevamente.");
  const assertOwned = async () => {
    const lock = await pb.collection("bloqueos_operacion").getOne(lockId);
    if (lock.propietario !== owner || new Date(lock.vence).getTime() <= Date.now()) throw new DomainError("INVALID", "La operación venció. Intentá nuevamente.");
  };
  try { return await run(assertOwned); }
  finally {
    try { const lock = await pb.collection("bloqueos_operacion").getOne(lockId); if (lock.propietario === owner) await pb.collection("bloqueos_operacion").delete(lockId); }
    catch (e) { if (!(e instanceof ClientResponseError) || e.status !== 404) console.error("No se pudo liberar un bloqueo de operación."); }
  }
}
