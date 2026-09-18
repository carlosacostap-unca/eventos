import { describe, expect, it } from "vitest";

import { createPocketBaseClient } from "@/lib/pocketbase/factory";

describe("clientes PocketBase", () => {
  it("crea almacenes de autenticación aislados", () => {
    const first = createPocketBaseClient("https://pb.example.com", "token-1");
    const second = createPocketBaseClient("https://pb.example.com", "token-2");
    expect(first).not.toBe(second);
    expect(first.authStore).not.toBe(second.authStore);
    expect(first.authStore.token).toBe("token-1");
    expect(second.authStore.token).toBe("token-2");
  });
});
