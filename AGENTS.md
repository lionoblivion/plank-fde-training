# WorkBot

WorkBot — приложение на Next.js (App Router) с TypeScript, Tailwind CSS и shadcn/ui.
Пакетный менеджер: pnpm. Деплой: Vercel (preview на каждую ветку, production на main).

## Команды

- `pnpm dev` — локальный сервер на http://localhost:3000
- `pnpm check` — ESLint, Prettier, tsc и next build. Запускайте перед каждым коммитом.
- `pnpm exec prettier --write .` — автоформатирование

## Структура

- `src/app/` — маршруты: `page.tsx` (страница), `route.ts` (API), `layout.tsx` (обёртка)
- `src/components/ui/` — компоненты shadcn/ui, генерируются CLI
- `src/components/` — собственные компоненты
- `src/lib/` — общий код и утилиты

## Соглашения

1. Компоненты серверные по умолчанию. `"use client"` добавляйте только при реальной необходимости
   (состояние, обработчики событий, API браузера). Серверный компонент рендерится на сервере и не отправляет JavaScript в браузер.
2. `process.env` читается только в `src/lib/config.ts`. Остальной код импортирует значения оттуда.
3. UI-компоненты добавляйте через `pnpm dlx shadcn@latest add <name>`, а не пишите вручную.
4. Алиас импортов: `@/` указывает на `src/`.
5. Изменение готово, только когда `pnpm check` проходит.
6. Секреты не коммитьте. Переменные окружения хранятся в `.env.local` и в настройках Vercel.
7. Ветки именуйте `feat/<NNNN>-<задача>`: четырёхзначный порядковый номер и краткий kebab-case slug задачи.
   Примеры: `feat/0001-health`, `feat/0011-add-vitest`. Следующий номер — на единицу больше последнего `feat/NNNN-*` в репозитории.
   Не используйте формат без номера (`feat/health`).

## Инструменты Claude Code

### Skills

- `/component` — создаёт React-компонент в `src/components/` и соседний Vitest-тест по паттернам проекта.
- `/api-route` — создаёт API-маршрут в `src/app/api/` со схемами Zod, обработчиками и тестами.
- `/pre-deploy` — прогоняет typecheck, тесты, поиск `console.log` и сверку env перед выкладкой.
- `/pr-review` — параллельно запускает трёх ревьюеров по diff PR или ветки и собирает общий вердикт.

### Subagents

- **Bug Hunter** — ищет ошибки логики, null/undefined, Promise и race conditions.
- **Performance Reviewer** — ищет проблемы производительности, лишние await, bundle и ненужный `"use client"`.
- **Security Reviewer** — ищет injection, проблемы auth, утечки секретов и небезопасную обработку данных.

### Hook

- **Prettier после Edit|Write** — PostToolUse hook в `.claude/settings.json` форматирует изменённый файл через Prettier сразу после записи.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
