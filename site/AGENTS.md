# WorkBot Site

Публичный маркетинговый сайт WorkBot. Здесь только презентация продукта для посетителей: лендинг и статический контент.

- Нет базы данных, API routes, секретов и бизнес-логики основного приложения.
- Не импортировать код из корневого `src/` и не читать `process.env` основного WorkBot.
- Изменения сайта ограничивайте папкой `site/`.

Команды из корня монорепо: `pnpm --filter workbot-site dev` (порт 3001), `pnpm --filter workbot-site check`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
