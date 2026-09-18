import { describe, expect, it } from "vitest";

import { secretsMatch } from "@/lib/auth/secrets";

describe("comparación de secretos", () => {
  it("acepta únicamente coincidencias exactas", () => {
    expect(secretsMatch("secreto-interno", "secreto-interno")).toBe(true);
    expect(secretsMatch("secreto-interno", "otro-secreto")).toBe(false);
    expect(secretsMatch("secreto-interno", "corto")).toBe(false);
  });
});
