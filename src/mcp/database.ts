import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Одна SQL-команда → строки результата (как в src/lib/db). */
export type QueryFn = (
  text: string,
  params?: unknown[],
) => Promise<Record<string, unknown>[]>;

function toolText(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

/** Список пользовательских таблиц в public. */
async function listPublicTables(query: QueryFn): Promise<string[]> {
  const rows = await query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_type = 'BASE TABLE'
     order by table_name`,
  );
  return rows.map((row) => String(row.table_name));
}

/**
 * Read-only MCP-сервер над переданной query-функцией:
 * tools query / schema / describe-table и resource db://tables.
 */
export function databaseServer(query: QueryFn): McpServer {
  const server = new McpServer({
    name: "database",
    version: "1.0.0",
  });

  server.registerTool(
    "query",
    {
      description:
        "Выполнить один SQL-оператор и вернуть до 100 строк результата",
      inputSchema: z.object({
        sql: z.string().describe("SQL-оператор"),
      }),
    },
    async ({ sql }) => {
      try {
        const rows = await query(sql);
        return toolText(rows.slice(0, 100));
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );

  server.registerTool(
    "schema",
    {
      description:
        "Колонки (information_schema) и ограничения (pg_constraint) схемы public",
    },
    async () => {
      try {
        const [columns, constraints] = await Promise.all([
          query(
            `select table_name, column_name, data_type, is_nullable, column_default
             from information_schema.columns
             where table_schema = 'public'
             order by table_name, ordinal_position`,
          ),
          query(
            `select
               c.conname as constraint_name,
               c.contype as constraint_type,
               rel.relname as table_name,
               pg_get_constraintdef(c.oid) as definition
             from pg_constraint c
             join pg_class rel on rel.oid = c.conrelid
             join pg_namespace n on n.oid = rel.relnamespace
             where n.nspname = 'public'
             order by rel.relname, c.conname`,
          ),
        ]);
        return toolText({ columns, constraints });
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );

  server.registerTool(
    "describe-table",
    {
      description:
        "Колонки таблицы, число строк и 5 примеров строк (имя только из whitelist)",
      inputSchema: z.object({
        table: z.string().describe("Имя таблицы в public"),
      }),
    },
    async ({ table }) => {
      try {
        const tables = await listPublicTables(query);
        if (!tables.includes(table)) {
          return toolError(
            `Unknown table: ${table}. Available: ${tables.join(", ") || "(none)"}`,
          );
        }

        // Имя уже сверено со списком — Postgres не принимает идентификатор как $1
        const [columns, countRows, sample] = await Promise.all([
          query(
            `select column_name, data_type, is_nullable, column_default
             from information_schema.columns
             where table_schema = 'public' and table_name = $1
             order by ordinal_position`,
            [table],
          ),
          query(`select count(*)::int as count from "${table}"`),
          query(`select * from "${table}" limit 5`),
        ]);

        return toolText({
          table,
          columns,
          rowCount: Number(countRows[0]?.count ?? 0),
          sample,
        });
      } catch (error) {
        return toolError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  );

  server.registerResource(
    "tables",
    "db://tables",
    {
      description: "Список таблиц в схеме public",
      mimeType: "application/json",
    },
    async (uri) => {
      const tables = await listPublicTables(query);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(tables, null, 2),
          },
        ],
      };
    },
  );

  return server;
}
