import { createHash, randomBytes } from "node:crypto";

export function recordId() { return randomBytes(10).toString("hex").slice(0, 15); }
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export function fingerprint(value: unknown) { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
