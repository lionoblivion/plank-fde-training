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
    // Cursor hooks — Node CJS-скрипты со stdin/stdout JSON
    ".cursor/hooks/**",
    // Публичный сайт — отдельное Next.js-приложение со своим ESLint
    "site/**",
  ]),
]);

export default eslintConfig;
