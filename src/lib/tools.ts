import { z } from "zod";

import { config } from "@/lib/config";
import type { Tool } from "@/lib/tool-def";
import { calculatorTool } from "@/lib/tools/calculator";
import { notesTool } from "@/lib/tools/notes";
import { readUrlTool, webSearchTool } from "@/lib/tools/web";

export type { Tool } from "@/lib/tool-def";
export { tool, toolInputJsonSchema } from "@/lib/tool-def";

const registry = new Map<string, Tool>();

/** Регистрация инструмента по имени (последняя побеждает). */
export function registerTool<TSchema extends z.ZodType>(
  def: Tool<TSchema>,
): void {
  registry.set(def.name, def as Tool);
}

/** Список для преобразования в API-формат провайдера. */
export function listTools(): Tool[] {
  return [...registry.values()];
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

/**
 * Разбор аргументов через Zod, затем run.
 * Registry сам модель не вызывает.
 */
export async function executeTool(
  name: string,
  rawArgs: unknown,
): Promise<unknown> {
  const def = registry.get(name);
  if (!def) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const args = def.input.parse(rawArgs);
  return def.run(args);
}

/** Сброс реестра — только для тестов. */
export function resetToolRegistry(): void {
  registry.clear();
}

/** Стандартный набор WorkBot. web_search — только при TAVILY_API_KEY. */
export function registerDefaultTools(): void {
  registerTool(calculatorTool);
  registerTool(readUrlTool);
  registerTool(notesTool);
  if (config.tavilyApiKey) {
    registerTool(webSearchTool);
  }
}

// Регистрация при загрузке модуля (сервер / CLI)
registerDefaultTools();
