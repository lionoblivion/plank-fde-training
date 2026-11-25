/**
 * Идемпотентные DDL-операторы. Запускаются при старте соединения.
 * Не редактировать уже добавленные строки — только дописывать новые в конец.
 */
export const schemaStatements = [
  `create table if not exists requests (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    details text not null default '',
    team text not null,
    priority text not null default 'medium',
    status text not null default 'open',
    created_at timestamptz not null default now()
  )`,
  // wall-clock: два быстрых insert не получают один now() транзакции
  `alter table requests alter column created_at set default clock_timestamp()`,
  // стабильный порядок «новые сверху» при одинаковом created_at
  `create sequence if not exists requests_seq`,
  `alter table requests add column if not exists seq bigint not null default nextval('requests_seq')`,
  `create index if not exists requests_created_at_seq_idx on requests (created_at desc, seq desc)`,
  `create index if not exists requests_team_idx on requests (team)`,
  `create index if not exists requests_status_idx on requests (status)`,
  // Заметки агента / инструментов Day 7
  `create table if not exists notes (
    id uuid primary key default gen_random_uuid(),
    body text not null,
    created_at timestamptz not null default clock_timestamp()
  )`,
  `create index if not exists notes_created_at_idx on notes (created_at desc)`,
] as const;
