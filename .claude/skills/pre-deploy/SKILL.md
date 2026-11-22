---
name: pre-deploy
description: Запускает pre-deploy проверки WorkBot (typecheck, тесты, console.log, env) и печатает таблицу PASS/FAIL. Используй при /pre-deploy перед выкладкой.
disable-model-invocation: true
---

# /pre-deploy

Запусти фиксированный pre-deploy чеклист. **Не** меняй код приложения. В ответе — **только** таблица результатов и итоговый вердикт.

## Сбор результатов через inline shell

Выполни проверки через inline shell Claude Code (до формирования ответа). Зафиксируй код выхода каждой команды.

### 1. TypeScript — `typecheck`

```
Typecheck: !`pnpm typecheck`
```

- PASS, если код выхода 0.
- FAIL иначе (в том числе если скрипта `typecheck` нет в `package.json`).
- В этом репозитории `typecheck` должен соответствовать `tsc --noEmit` (при необходимости после `next typegen`). Другой чекер не выдумывай.

### 2. Тесты — `test`

```
Tests: !`pnpm test`
```

- PASS при коде выхода 0.
- FAIL иначе.

### 3. `console.log` в `src/`

```
Console.log: !`rg -n "console\\.log" src || true`
```

- PASS, если совпадений в `src/` **нет**.
- FAIL, если есть хотя бы один `console.log` (в таблице укажи число, не дамп логов).
- Предпочтительно `rg`; иначе эквивалентный поиск только по `src/`.

### 4. Переменные окружения

```
Env example: !`test -f .env.example && echo present || echo missing`
Env local: !`test -f .env.local && echo present || echo missing`
```

Далее:

1. Если `.env.example` **нет** → FAIL (нечего сверять).
2. Если есть — прочитай имена переменных (пустые строки и комментарии игнор).
3. Если есть `.env.local` — бери из него значения этих ключей.
4. PASS только если каждый ключ из `.env.example` есть в `.env.local` (или в окружении). Пустое значение = FAIL для ключа.
5. Секреты не печатай — только имена ключей и PASS/FAIL.

Приложение читает env через `src/lib/config.ts`. Эта проверка всё равно нужна для готовности к деплою.

## Формат вывода (строго)

Только markdown-таблица и одна строка вердикта. Без длинных пояснений, правок кода и советов по коммиту.

| Проверка                            | Результат     |
| ----------------------------------- | ------------- |
| TypeScript (`pnpm typecheck`)       | PASS или FAIL |
| Тесты (`pnpm test`)                 | PASS или FAIL |
| Нет `console.log` в `src/`          | PASS или FAIL |
| Env (`.env.example` → `.env.local`) | PASS или FAIL |

Итоговая строка:

- `ГОТОВО К ДЕПЛОЮ`, если все строки PASS.
- `НЕ ГОТОВО К ДЕПЛОЮ`, если есть хотя бы один FAIL.

При «не готово» можно одной фразой перечислить только упавшие проверки.
