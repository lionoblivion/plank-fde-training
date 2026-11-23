import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { query } from "@/lib/db";
import { createRequest, resetRequestStore } from "@/lib/requests";

import { databaseServer } from "./database";

describe("database MCP server", () => {
  let client: Client;

  beforeEach(async () => {
    await resetRequestStore();
    await createRequest({
      title: "MCP test request",
      details: "fixture",
      team: "operations",
      priority: "high",
    });

    const server = databaseServer(query);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: "database-test", version: "1.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  it("query возвращает строки по SQL", async () => {
    const result = await client.callTool({
      name: "query",
      arguments: {
        sql: "select team, count(*)::int as count from requests group by team order by team",
      },
    });

    expect(result.isError).toBeFalsy();
    const text = String(
      (result.content as { type: string; text: string }[])[0]?.text,
    );
    const rows = JSON.parse(text) as { team: string; count: number }[];
    expect(
      rows.some((row) => row.team === "operations" && row.count >= 1),
    ).toBe(true);
  });

  it("schema отдаёт колонки и ограничения", async () => {
    const result = await client.callTool({
      name: "schema",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = String(
      (result.content as { type: string; text: string }[])[0]?.text,
    );
    const payload = JSON.parse(text) as {
      columns: { table_name: string; column_name: string }[];
      constraints: { table_name: string; constraint_name: string }[];
    };
    expect(
      payload.columns.some(
        (col) => col.table_name === "requests" && col.column_name === "team",
      ),
    ).toBe(true);
    expect(payload.constraints.some((c) => c.table_name === "requests")).toBe(
      true,
    );
  });

  it("describe-table отдаёт колонки, count и sample", async () => {
    const result = await client.callTool({
      name: "describe-table",
      arguments: { table: "requests" },
    });

    expect(result.isError).toBeFalsy();
    const text = String(
      (result.content as { type: string; text: string }[])[0]?.text,
    );
    const payload = JSON.parse(text) as {
      table: string;
      rowCount: number;
      columns: unknown[];
      sample: unknown[];
    };
    expect(payload.table).toBe("requests");
    expect(payload.rowCount).toBeGreaterThanOrEqual(1);
    expect(payload.columns.length).toBeGreaterThan(0);
    expect(payload.sample.length).toBeGreaterThanOrEqual(1);
    expect(payload.sample.length).toBeLessThanOrEqual(5);
  });

  it("describe-table отклоняет неизвестную таблицу через isError", async () => {
    const result = await client.callTool({
      name: "describe-table",
      arguments: { table: "no_such_table; drop table requests" },
    });

    expect(result.isError).toBe(true);
    const text = String(
      (result.content as { type: string; text: string }[])[0]?.text,
    );
    expect(text).toMatch(/Unknown table/i);
  });

  it("resource db://tables перечисляет таблицы", async () => {
    const result = await client.readResource({ uri: "db://tables" });
    const text =
      result.contents[0] && "text" in result.contents[0]
        ? String(result.contents[0].text)
        : "";
    const tables = JSON.parse(text) as string[];
    expect(tables).toContain("requests");
  });

  it("query возвращает isError при ошибке SQL", async () => {
    const result = await client.callTool({
      name: "query",
      arguments: { sql: "select * from definitely_missing" },
    });

    expect(result.isError).toBe(true);
  });
});
