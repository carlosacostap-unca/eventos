export const EXHIBITION_OWNER_INDEX = "CREATE INDEX idx_exposicion_responsable ON exposiciones (evento,responsable)";
export const INDIVIDUAL_CERTIFICATE_INDEX = "CREATE UNIQUE INDEX idx_certificados_inscripcion ON certificados (inscripcion) WHERE exposicion = ''";

export function multipleExhibitionIndexes(collection: "exposiciones" | "certificados", indexes: string[]) {
  const normalize = (sql: string) => sql.replace(/["`\[\]]/g, "").replace(/;\s*$/, "").trim().toLowerCase();
  const legacy = collection === "exposiciones"
    ? /^create\s+unique\s+index\s+(?:if\s+not\s+exists\s+)?\S+\s+on\s+exposiciones\s*\(\s*evento\s*,\s*responsable\s*\)$/
    : /^create\s+unique\s+index\s+(?:if\s+not\s+exists\s+)?\S+\s+on\s+certificados\s*\(\s*inscripcion\s*\)$/;
  const desired = collection === "exposiciones" ? EXHIBITION_OWNER_INDEX : INDIVIDUAL_CERTIFICATE_INDEX;
  const kept = indexes.filter((sql) => !legacy.test(normalize(sql)));
  const compact = (sql: string) => normalize(sql).replace(/\s+/g, "");
  if (kept.some((sql) => compact(sql) === compact(desired))) return kept;
  const name = collection === "exposiciones" ? "idx_exposicion_responsable" : "idx_certificados_inscripcion";
  const sameName = new RegExp("^create\\s+(?:unique\\s+)?index\\s+(?:if\\s+not\\s+exists\\s+)?" + name + "\\s+on\\s+");
  return [...kept.filter((sql) => !sameName.test(normalize(sql))), desired];
}
