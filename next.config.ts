import os from "node:os";

import type { NextConfig } from "next";

/** Локальные IPv4 (Wi‑Fi / LAN), чтобы телефон мог ходить на next dev. */
function lanDevOrigins(): string[] {
  const origins = new Set<string>();
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      // Node: "IPv4" или устаревший числовой 4
      if (entry.internal) continue;
      const family = String(entry.family);
      if (family !== "IPv4" && family !== "4") continue;
      origins.add(entry.address);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Иначе с http://192.168.x.x:3000 Next блокирует /_next/* — чат «мёртвый»
  allowedDevOrigins: lanDevOrigins(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
