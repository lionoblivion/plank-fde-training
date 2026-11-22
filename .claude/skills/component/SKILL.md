---
name: component
description: Создаёт React-компонент WorkBot в src/components с соседним тестом Vitest. Используй при /component или запросе на новый UI-компонент по паттернам проекта.
argument-hint: "<Name>"
---

# /component $ARGUMENTS

Создай новый React-компонент для WorkBot из `$ARGUMENTS` (имя компонента — `$0`).

## Перед началом

1. Прочитай `AGENTS.md` и следуй его соглашениям.
2. Ориентируйся на `src/components/site-header.tsx` и `src/components/site-header.test.tsx`.
3. Не создавай barrel-файлы (`index.ts`). Импорты прямые, например `@/components/site-header`.

## Именование

- `$0` — имя в PascalCase (например `Notice`).
- Имя файла — kebab-case (например `Notice` → `notice`).
- Файлы:
  - `src/components/<kebab-name>.tsx`
  - `src/components/<kebab-name>.test.tsx`
- Экспортируй именованную функцию в PascalCase `$0` (например `export function Notice()`).

## Правила компонента

1. По умолчанию Server Component. `"use client"` — только для состояния, обработчиков событий или API браузера.
2. Используй существующие примитивы shadcn из `src/components/ui/` (`Button`, `Card`, `Badge`). Недостающий примитив добавляй через `pnpm dlx shadcn@latest add <name>`, не пиши ui вручную.
3. Tailwind-токены проекта (`text-muted-foreground`, `border-border`, `max-w-2xl` и т.д.), в духе `site-header.tsx` / `footer.tsx`.
4. Алиас `@/` для импортов из `src/`.
5. Не читай `process.env` в компоненте; при необходимости бери значения из `@/lib/config`.
6. Не добавляй export в barrel-файлы (их нет).
7. Пользовательский текст в UI — на русском.

## Правила теста

По образцу `site-header.test.tsx`:

- Vitest: `describe` / `it` / `expect` из `vitest`.
- Рендер через `renderToStaticMarkup` из `react-dom/server` (без браузера и без Testing Library, если её ещё нет в проекте).
- Импорт компонента из `./<kebab-name>`.
- Проверяй видимый текст и важные атрибуты (`href` и т.п.).

## Порядок работы

1. Получи kebab-case путь из `$0`.
2. Создай файл компонента.
3. Создай соседний `.test.tsx`.
4. Запусти `pnpm test` и исправь ошибки.
5. Не меняй несвязанный код приложения.

## Пример

`/component Notice` →

- `src/components/notice.tsx` с экспортом `Notice`
- `src/components/notice.test.tsx` с проверкой разметки
