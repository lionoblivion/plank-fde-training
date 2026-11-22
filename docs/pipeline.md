# WorkBot — архитектура пайплайна

Источник правды: `../doc-plank-fde-training/пайплайн.md` (локальная папка). Этот файл — краткий снимок; при расхождении верьте локальному.

## Этапы пайплайна (по порядку)

| №   | Этап               | Что делает                                                                                                                                            |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Задача             | Формулируется фича или правка, которую нужно сделать.                                                                                                 |
| 2   | Ветка              | Создаётся ветка `feat/WB-<N>` от актуального `main` (id тикета Linear, напр. `feat/WB-11`).                                                           |
| 3   | Код                | Пишется/меняется код в Cursor или Claude Code; при необходимости вызываются Skills `/component` и `/api-route` для скаффолда.                         |
| 4   | Hook Prettier      | После каждого Edit/Write Claude Code автоматически форматирует изменённый файл через Prettier (`.claude/settings.json`).                              |
| 5   | Локальная проверка | Запускается `pnpm check`: ESLint → Prettier --check → next typegen → tsc → Vitest → next build. Без зелёного check коммит не считается готовым.       |
| 6   | Commit + push      | Subject: `WB-<N>: <название задачи из Linear>`; доп. комментарии в body.                                                                              |
| 7   | Pull Request       | Создаётся PR (`gh pr create`). Открывается обсуждение и гейты.                                                                                        |
| 8   | Ревью `/pr-review` | Параллельно запускаются Bug Hunter, Performance Reviewer и Security Reviewer по diff; собирается общий вердикт (APPROVE / COMMENT / REQUEST CHANGES). |
| 9   | CI GitHub Actions  | Workflow `.github/workflows/check.yml` на PR/push: install с frozen lockfile и тот же `pnpm check` в чистой среде.                                    |
| 10  | Vercel Preview     | На ветку/PR поднимается preview-деплой для ручной проверки UI.                                                                                        |
| 11  | Merge в `main`     | При зелёном CI и приемлемом ревью PR мержится (`gh pr merge --merge`), локально делается `git switch main && git pull`.                               |
| 12  | Production         | Vercel деплоит `main` в production. Опционально перед важной выкладкой — `/pre-deploy` (typecheck, test, поиск `console.log`, сверка env).            |

## Диаграмма

```mermaid
flowchart TD
  s1["1. Задача\nсформулировать фичу"] --> s2["2. Ветка\nfeat/WB-N"]
  s2 --> s3["3. Код\nCursor / Claude Code + Skills"]
  s3 --> s4["4. Hook Prettier\nавтоформат после Edit/Write"]
  s4 --> s5["5. pnpm check\nlint · format · types · tests · build"]
  s5 --> s6["6. Commit + push\nWB-N: название задачи"]
  s6 --> s7["7. Pull Request\ngh pr create"]
  s7 --> s8["8. /pr-review\nBug · Perf · Security"]
  s7 --> s9["9. GitHub Actions\npnpm check в CI"]
  s7 --> s10["10. Vercel Preview\nпроверка UI"]
  s8 --> s11["11. Merge → main\nпринятие изменений"]
  s9 --> s11
  s10 --> s11
  s11 --> s12["12. Production\nVercel + опционально /pre-deploy"]
```

## Детали по контурам

### Локальная разработка (этапы 1–6)

- Skills `/component` и `/api-route` ускоряют создание компонентов и API по соглашениям проекта.
- Hook Prettier не заменяет `pnpm check`: он только форматирует файл сразу после правки.
- `pnpm check` — единый локальный и CI-гейт качества.

### Pull Request (этапы 7–10)

- Три гейта идут **параллельно**: ревью агентами, CI, preview.
- Merge допускается только когда CI зелёный и вердикт ревью приемлемый.

### Выкладка (этапы 11–12)

- Production всегда с `main`.
- `/pre-deploy` — дополнительный чеклист перед ответственной выкладкой, не вместо CI.

## Автоматизация Claude Code

| Тип      | Имя                       | Назначение                           | Где в пайплайне |
| -------- | ------------------------- | ------------------------------------ | --------------- |
| Skill    | `/component`              | React-компонент + Vitest-тест        | Этап 3          |
| Skill    | `/api-route`              | API route + Zod + тесты              | Этап 3          |
| Skill    | `/pre-deploy`             | Гейты перед выкладкой                | Этап 12         |
| Skill    | `/pr-review`              | Параллельное ревью тремя агентами    | Этап 8          |
| Subagent | Bug Hunter                | Логика, null, Promise, race          | Этап 8          |
| Subagent | Performance Reviewer      | await, bundle, лишний `"use client"` | Этап 8          |
| Subagent | Security Reviewer         | injection, auth, секреты             | Этап 8          |
| Hook     | PostToolUse `Edit\|Write` | Prettier на изменённый файл          | Этап 4          |

Конфиг hook: `.claude/settings.json`.  
CI: `.github/workflows/check.yml`.

## Правило обновления

Если меняется любой элемент пайплайна (скрипты `package.json`, workflow, Skills, Subagents, Hooks, ветвление, деплой) — обновите:

1. Этот файл (`docs/pipeline.md`) — **включая нумерацию этапов и описания «что делает»**
2. Раздел «Инструменты Claude Code» в `AGENTS.md`, если затронуты Skills / Subagents / Hook
