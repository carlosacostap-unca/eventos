import { describe, expect, it, vi } from "vitest";

import { processDeliveryAttempt, sanitizeMailError } from "@/lib/email/queue";
import type { DeliveryRecord } from "@/lib/domain/models";

const delivery: DeliveryRecord = {
  id: "mail-1",
  evento: "event-1",
  inscripcion: "registration-1",
  certificado: "certificate-1",
  estado: "pendiente",
  intentos: 0,
  historial: [],
};

describe("cola de correo", () => {
  it("marca un envío exitoso y conserva historial", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const result = await processDeliveryAttempt(delivery, {
      send: vi.fn().mockResolvedValue(undefined),
      update,
      now: () => new Date("2027-01-01T10:00:00.000Z"),
    });
    expect(result).toBe("enviado");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "enviado",
        intentos: 1,
        historial: [{ date: "2027-01-01T10:00:00.000Z", status: "enviado" }],
      }),
    );
  });

  it("marca solo el trabajo fallido y oculta secretos del error", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const result = await processDeliveryAttempt(delivery, {
      send: vi.fn().mockRejectedValue(new Error("password=secreto conexión fallida")),
      update,
    });
    expect(result).toBe("fallido");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "fallido", intentos: 1 }),
    );
    expect(sanitizeMailError(new Error("token=abc123"))).not.toContain("abc123");
  });
});
