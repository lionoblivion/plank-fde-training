# API routes

Каждый маршрут: `route.ts`, `types.ts`, `route.test.ts`.
Zod-схемы в `types.ts` — контракт request/response.
HTTP-статусы в коде: `200` (успех GET), `201` (создание), `400` (невалидный JSON/Zod).
`route.ts` — только HTTP (parse, Zod, `Response.json`); бизнес-логика через функции `@/lib`.
`process.env` здесь не читать — только `@/lib/config`.
