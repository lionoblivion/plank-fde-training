export const config = {
  env: process.env.VERCEL_ENV ?? "local",
  commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
};
