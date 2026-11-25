import type { Tool } from "@/lib/tool-def";
import { toolInputJsonSchema } from "@/lib/tool-def";
import { getTool } from "@/lib/tools";

/** Лимит раундов tool loop в одном stream(). */
export const MAX_TOOL_ROUNDS = 8;

/** Событие выполненного (или failed) вызова инструмента. */
export type ToolCallEvent = {
  name: string;
  input: unknown;
  result: unknown;
  isError: boolean;
};

/** Колбэки стрима: текст + опционально tool calls для CLI. */
export type StreamEvents = {
  text: (delta: string) => void;
  tool?: (call: ToolCallEvent) => void;
};

export function normalizeStreamEvents(
  events: StreamEvents | ((delta: string) => void),
): StreamEvents {
  return typeof events === "function" ? { text: events } : events;
}

/** JSON Schema без $schema — для API провайдеров. */
export function toolParametersSchema(tool: Tool): Record<string, unknown> {
  const schema = { ...toolInputJsonSchema(tool) };
  delete schema.$schema;
  return schema;
}

/**
 * Находит tool, парсит input схемой, run; ошибки → isError для модели.
 * Исключения наружу не пробрасываем.
 */
export async function runToolCall(
  name: string,
  rawInput: unknown,
): Promise<ToolCallEvent> {
  const def = getTool(name);
  if (!def) {
    return {
      name,
      input: rawInput,
      result: `Unknown tool: ${name}`,
      isError: true,
    };
  }

  let input: unknown = rawInput;
  try {
    input = def.input.parse(rawInput);
  } catch (error) {
    return {
      name,
      input: rawInput,
      result: error instanceof Error ? error.message : String(error),
      isError: true,
    };
  }

  try {
    const result = await def.run(input);
    return { name, input, result, isError: false };
  } catch (error) {
    return {
      name,
      input,
      result: error instanceof Error ? error.message : String(error),
      isError: true,
    };
  }
}

/** Сериализация результата для tool_result / function_call_output. */
export function serializeToolResult(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export function toAnthropicTools(tools: Tool[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: toolParametersSchema(tool) as {
      type: "object";
      [key: string]: unknown;
    },
    eager_input_streaming: true as const,
  }));
}

export function toOpenAIFunctionTools(tools: Tool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: toolParametersSchema(tool),
    strict: true as const,
  }));
}

/** Chat Completions (Groq) — tools[].function. */
export function toChatCompletionsTools(tools: Tool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toolParametersSchema(tool),
    },
  }));
}
