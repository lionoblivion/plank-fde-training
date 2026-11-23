import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/** 6-строчный разбор `.env.local` → test.env (в CI ключ уже в process.env). */
function loadEnvLocal(): Record<string, string> {
  const env: Record<string, string> = {};
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m?.[1] || line.trimStart().startsWith("#")) continue;
    let v = (m[2] ?? "").trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.live.test.ts"],
    testTimeout: 180_000,
    env: loadEnvLocal(),
    fileParallelism: false,
    maxWorkers: 1,
  },
});
