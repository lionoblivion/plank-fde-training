export const config = {
  env: process.env.VERCEL_ENV ?? "local",
  commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  /** postgres://… | memory:// | пусто → PGlite в .data/pg */
  databaseUrl: process.env.DATABASE_URL,
  /**
   * Project API key PostHog (capture). Курс: POSTHOG_KEY.
   * Alias POST_HOG_API — локальное имя из setup.
   */
  posthogKey: process.env.POSTHOG_KEY ?? process.env.POST_HOG_API,
  /** Хост capture API, без trailing slash (только https) */
  posthogHost: (() => {
    const raw = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") {
        return "https://us.i.posthog.com";
      }
      return raw.replace(/\/$/, "");
    } catch {
      return "https://us.i.posthog.com";
    }
  })(),
};
