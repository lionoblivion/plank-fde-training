import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

import { config } from "@/lib/config";
import { schemaStatements } from "@/lib/schema";

const DB_KEY = "__workbot_db__";

type QueryFn = (
  text: string,
  params?: unknown[],
) => Promise<Record<string, unknown>[]>;

type GlobalWithDb = typeof globalThis & {
  [DB_KEY]?: Promise<QueryFn>;
};

/** Прогон идемпотентной схемы при открытии соединения. */
async function applySchema(run: QueryFn): Promise<void> {
  for (const statement of schemaStatements) {
    await run(statement);
  }
}

async function createPostgresQuery(url: string): Promise<QueryFn> {
  const sql = postgres(url, { max: 1 });
  const run: QueryFn = async (text, params = []) => {
    const rows = await sql.unsafe(text, params as never[]);
    return rows as unknown as Record<string, unknown>[];
  };
  await applySchema(run);
  return run;
}

async function createPgliteQuery(
  dataDir: string | undefined,
): Promise<QueryFn> {
  const db = dataDir ? await PGlite.create(dataDir) : await PGlite.create();
  const run: QueryFn = async (text, params = []) => {
    const result = await db.query(text, params);
    return result.rows as Record<string, unknown>[];
  };
  await applySchema(run);
  return run;
}

/**
 * Один клиент на процесс (globalThis): route bundles Next не делят модули.
 * - postgres://… → postgres.js
 * - memory:// → PGlite в памяти (тесты)
 * - иначе → PGlite в .data/pg
 */
async function getQuery(): Promise<QueryFn> {
  const globalWithDb = globalThis as GlobalWithDb;
  if (!globalWithDb[DB_KEY]) {
    const url = config.databaseUrl;
    globalWithDb[DB_KEY] = (async () => {
      if (url?.startsWith("postgres://") || url?.startsWith("postgresql://")) {
        return createPostgresQuery(url);
      }
      if (url === "memory://" || url?.startsWith("memory://")) {
        return createPgliteQuery(undefined);
      }
      return createPgliteQuery(".data/pg");
    })();
  }
  return globalWithDb[DB_KEY];
}

/** Выполняет один SQL-оператор с параметрами $1…$n, возвращает строки-объекты. */
export async function query(
  text: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  const run = await getQuery();
  return run(text, params);
}

/** Сброс кэша соединения — только для тестов. */
export function resetDbConnection(): void {
  const globalWithDb = globalThis as GlobalWithDb;
  delete globalWithDb[DB_KEY];
}
