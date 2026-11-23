/** Vitest: in-memory PGlite до импорта модулей с query. */
process.env.DATABASE_URL = "memory://";
// Аналитика в unit-тестах по умолчанию выключена (нет cookies()/after context)
delete process.env.POSTHOG_KEY;
delete process.env.POST_HOG_API;
