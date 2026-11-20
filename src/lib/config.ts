export const config = {
  env: process.env.VERCEL_ENV ?? "local",
  commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
};
