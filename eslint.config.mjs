import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "drizzle/**",
    ".agents/**",
    "skills-lock.json",
    "opencode.json",
    // Scratch de depuración; ya ignorado por git.
    "scripts/tmp-*.ts",
    "scripts/scratch-*.ts",
  ]),
]);

export default eslintConfig;