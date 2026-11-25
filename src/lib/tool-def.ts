import { z } from "zod";

/**
 * Описание инструмента для модели: схема Zod + run.
 * Не привязан к Gemini/Groq/Qwen — адаптер провайдера берёт listTools().
 */
export type Tool<TSchema extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: TSchema;
  run: (args: z.infer<TSchema>) => Promise<unknown> | unknown;
};

/** Выводит тип аргумента run из Zod-схемы. */
export function tool<TSchema extends z.ZodType>(def: {
  name: string;
  description: string;
  input: TSchema;
  run: (args: z.infer<TSchema>) => Promise<unknown> | unknown;
}): Tool<TSchema> {
  return def;
}

/** JSON Schema входа (Zod 4) — без привязки к провайдеру. */
export function toolInputJsonSchema(def: Tool): Record<string, unknown> {
  return z.toJSONSchema(def.input, {
    target: "draft-7",
  }) as Record<string, unknown>;
}
