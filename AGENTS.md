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
2. `process.env` читается только в `src/lib/env.ts`. Остальной код импортирует значения оттуда.
3. UI-компоненты добавляйте через `pnpm dlx shadcn@latest add <name>`, а не пишите вручную.
4. Алиас импортов: `@/` указывает на `src/`.
5. Изменение готово, только когда `pnpm check` проходит.
6. Секреты не коммитьте. Переменные окружения хранятся в `.env.local` и в настройках Vercel.
