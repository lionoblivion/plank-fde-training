import { beforeEach, describe, expect, it } from "vitest";

import {
  executeTool,
  getTool,
  listTools,
  registerDefaultTools,
  resetToolRegistry,
  toolInputJsonSchema,
} from "@/lib/tools";

describe("tool registry", () => {
  beforeEach(() => {
    resetToolRegistry();
    registerDefaultTools();
  });

  it("регистрирует calculator, read_url, save_note", () => {
    const names = listTools()
      .map((t) => t.name)
      .sort();
    expect(names).toEqual(
      expect.arrayContaining(["calculator", "read_url", "save_note"]),
    );
  });

  it("web_search отсутствует без TAVILY_API_KEY", () => {
    expect(process.env.TAVILY_API_KEY).toBeUndefined();
    expect(getTool("web_search")).toBeUndefined();
  });

  it("executeTool валидирует аргументы до run", async () => {
    await expect(
      executeTool("calculator", { expression: 123 }),
    ).rejects.toThrow();
  });

  it("calculator через registry", async () => {
    const result = await executeTool("calculator", {
      expression: "2+2*2",
    });
    expect(result).toEqual({ expression: "2+2*2", value: 6 });
  });

  it("отдаёт JSON Schema входа", () => {
    const calc = getTool("calculator");
    expect(calc).toBeDefined();
    const schema = toolInputJsonSchema(calc!);
    expect(schema.type).toBe("object");
    expect(schema).toHaveProperty("properties");
  });
});
