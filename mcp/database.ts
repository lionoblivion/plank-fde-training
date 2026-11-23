/**
 * Stdio-entry MCP database: read-only postgres:// через DATABASE_URL.
 * Claude Code / Cursor стартуют: node --env-file-if-exists=.env.local --import tsx mcp/database.ts
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import postgres from "postgres";

import { databaseServer } from "../src/mcp/database";

const url = process.env.DATABASE_URL;

if (
  !url ||
  (!url.startsWith("postgres://") && !url.startsWith("postgresql://"))
) {
  // PGlite нельзя открыть во втором процессе рядом с Next — только Postgres
  console.error(
    "database MCP: DATABASE_URL must be a postgres:// (or postgresql://) URL",
  );
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  connection: {
    default_transaction_read_only: true,
  },
});

const query = async (
  text: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> => {
  const rows = await sql.unsafe(text, params as never[]);
  return rows as unknown as Record<string, unknown>[];
};

const server = databaseServer(query);
const transport = new StdioServerTransport();
await server.connect(transport);
