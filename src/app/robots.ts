import { existsSync } from "node:fs";
import { join } from "node:path";

import type { MetadataRoute } from "next";

import { config } from "@/lib/config";

function hasSitemap(): boolean {
  const appDir = join(process.cwd(), "src", "app");
  return ["sitemap.ts", "sitemap.js", "sitemap.tsx", "sitemap.jsx"].some(
    (name) => existsSync(join(appDir, name)),
  );
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    ...(hasSitemap() ? { sitemap: `${config.siteUrl}/sitemap.xml` } : {}),
  };
}
