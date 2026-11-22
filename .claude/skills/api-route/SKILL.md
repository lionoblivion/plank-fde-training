---
name: api-route
description: Создаёт API-маршрут WorkBot в src/app/api со схемами Zod, обработчиками и тестами Vitest. Используй при /api-route или запросе нового API endpoint.
argument-hint: "<name> [methods]"
---

# /api-route $ARGUMENTS

Создай API-маршрут. Аргументы: `$ARGUMENTS` (первый токен `$0` — сегмент пути; остальные — HTTP-методы).

## Разбор аргументов

- `$0` — имя папки маршрута (предпочтительно kebab-case), например `echo` → `src/app/api/echo/`.
- Остальные слова в `$ARGUMENTS` — методы (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Если методов нет — по умолчанию `GET`.
- Нормализуй методы в верхний регистр.

Пример: `/api-route echo POST` → `$0=echo`, методы=`POST`.

## Перед началом

1. Прочитай `AGENTS.md`.
2. Изучи маршруты в `src/app/api/` (например `health/route.ts`) и Vitest (`vitest.config.mts`, скрипт `test` в `package.json`).
3. `process.env` только через `@/lib/config` — не читай env напрямую в route.
4. Для схем нужен Zod. Если `zod` нет как **прямой** зависимости в `package.json`, добавь `pnpm add zod` до написания кода. Другие библиотеки не выдумывай.

## Какие файлы создать

В `src/app/api/$0/`:

1. `types.ts` — схемы Zod и выведенные типы request/response.
2. `route.ts` — обработчики запрошенных методов.
3. `route.test.ts` — тесты Vitest на каждый метод и отдельный тест невалидных данных.

Barrel `index.ts` не создавать.

## types.ts

- Схемы тела запроса для методов с body (например `postRequestSchema`).
- Схемы ответа (успех и при необходимости ошибка).
- Экспортируй типы через `z.infer<>` рядом со схемами.
- Схемы держи рядом с маршрутом; общую папку schemas не выдумывай.

## route.ts

- Импортируй схемы из `./types`.
- Экспортируй именованные функции App Router (`GET`, `POST`, …).
- Для body: `await request.json()`, валидация через Zod `.safeParse`.
- Коды ответа:
  - `400` — невалидный ввод (ошибка Zod), JSON с деталями валидации.
  - `404` — ресурс не найден.
  - `409` — конфликт при создании/обновлении.
  - `200` / `201` — успех.
- Возвращай `Response.json(...)` (как в `src/app/api/health/route.ts`).
- Sync-обработчик, если нет `await`; иначе `async`.
- При сомнениях читай docs App Router в `node_modules/next/dist/docs/`.

## route.test.ts

- Vitest (`describe`, `it`, `expect`).
- Для каждого метода: вызови handler с `Request` (или `NextRequest`, если уже так принято) и проверь status + JSON.
- Отдельный тест с невалидными данными → ожидай `400`.
- Без браузера; Testing Library не подключай без необходимости.
- Импорты из `./route` и `./types`.

## Порядок работы

1. Разбери `$0` и методы из `$ARGUMENTS`.
2. Убедись, что `zod` — прямая зависимость.
3. Создай `types.ts`, `route.ts`, `route.test.ts`.
4. Запусти `pnpm test` и исправь ошибки.
5. Не меняй несвязанный код приложения.

## Пример

`/api-route echo POST` создаёт:

```
src/app/api/echo/
  types.ts
  route.ts
  route.test.ts
```

с `POST`, который валидирует body через Zod, отдаёт валидный payload и `400` при ошибке.
