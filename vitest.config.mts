import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: [path.join(root, "src/lib/db-test-setup.ts")],
    // Live-suite — отдельно: pnpm test:live
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.live.test.ts"],
    // Один fork: PGlite / globalThis-соединение не шарится между процессами
    fileParallelism: false,
    maxWorkers: 1,
  },
});
