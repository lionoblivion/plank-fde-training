# WorkBot

WorkBot — приложение на Next.js (App Router) с TypeScript, Tailwind CSS и shadcn/ui.
Пакетный менеджер: pnpm. Деплой: Vercel (preview на каждую ветку, production на main).

## Команды

- `pnpm dev` — локальный сервер на http://localhost:3000
- `pnpm check` — ESLint, Prettier, tsc и next build. Запускайте перед каждым коммитом.
- `pnpm exec prettier --write .` — автоформатирование
- `docker compose up -d` — локальный Postgres; `DATABASE_URL=postgres://postgres@localhost:5433/workbot` в `.env.local`

## Структура

- `src/app/` — маршруты: `page.tsx` (страница), `route.ts` (API), `layout.tsx` (обёртка)
- `src/components/ui/` — компоненты shadcn/ui, генерируются CLI
- `src/components/` — собственные компоненты
- `src/lib/` — общий код и утилиты
- `content/policies/` — политики компании (Markdown + front matter)
- Folder-level `CLAUDE.md` (например `src/app/api/CLAUDE.md`, `content/policies/CLAUDE.md`) — локальные правила модуля; подгружаются при работе с этой папкой.

## Соглашения

1. Компоненты серверные по умолчанию. `"use client"` добавляйте только при реальной необходимости
   (состояние, обработчики событий, API браузера). Серверный компонент рендерится на сервере и не отправляет JavaScript в браузер.
2. `process.env` читается только в `src/lib/config.ts`. Остальной код импортирует значения оттуда.
3. UI-компоненты добавляйте через `pnpm dlx shadcn@latest add <name>`, а не пишите вручную.
4. Алиас импортов: `@/` указывает на `src/`.
5. Комментарии в коде пишите на русском языке. Имена в коде (функции, типы, файлы) — на английском.
6. Изменение готово, только когда `pnpm check` проходит.
7. Секреты не коммитьте. Переменные окружения хранятся в `.env.local` и в настройках Vercel.
8. Задачи и ветки совпадают с Linear (команда WB): ветка `feat/WB-<N>` (например `feat/WB-11`).
   Коммит: `WB-<N>: <название задачи из Linear>`; подробности — в body. Список: https://linear.app/lev789/team/WB/all
9. При любом изменении пайплайна (скрипты `check`/`test`, GitHub Actions, Vercel, Skills, Subagents, Hooks, процесс PR)
   обновляйте `../doc-plank-fde-training/пайплайн.md`. Если затронуты Skills / Subagents / Hook — синхронизируйте и раздел ниже.
10. Delivery начинается с **этапа 0 — Ресурсы** (Linear MCP, `gh`, Docker/БД, env): если ресурс не подключён — стоп, починить, затем продолжать. См. `пайплайн.md`.

## Инструменты Claude Code

### Skills

- `/component` — создаёт React-компонент в `src/components/` и соседний Vitest-тест по паттернам проекта.
- `/api-route` — создаёт API-маршрут в `src/app/api/` со схемами Zod, обработчиками и тестами.
- `/pre-deploy` — прогоняет typecheck, тесты, поиск `console.log` и сверку env перед выкладкой.
- `/pr-review` — ревью по Review Policy (число агентов от Risk Assessment LOW/MEDIUM/HIGH); в файле цикла указать вызванных Agents.

### Subagents

Запуск **условный** (см. Review Policy в `../doc-plank-fde-training/пайплайн.md`):

- **Bug Hunter** — логика, null/undefined, Promise, race (часто единственный на LOW).
- **Performance Reviewer** — await, bundle, лишний `"use client"` (MEDIUM по необходимости / HIGH всегда).
- **Security Reviewer** — injection, auth, секреты (MEDIUM по необходимости / HIGH всегда).

### Hook

- **Prettier после Edit|Write** — PostToolUse hook в `.claude/settings.json` форматирует изменённый файл через Prettier сразу после записи.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
