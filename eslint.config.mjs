import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    "output/**",
    "tmp/**",
    ".playwright-cli/**",
    // Visor BPMN distribuido por terceros y datos documentales generados.
    "docs/ingenieria-procesos/vendor/**",
    "docs/ingenieria-procesos/procesos.js",
  ]),
]);

export default eslintConfig;
