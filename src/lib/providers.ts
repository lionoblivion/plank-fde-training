import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { config } from "@/lib/config";
import type { Tool } from "@/lib/tool-def";
import {
  MAX_TOOL_ROUNDS,
  normalizeStreamEvents,
  runToolCall,
  serializeToolResult,
  toAnthropicTools,
  toChatCompletionsTools,
  toOpenAIFunctionTools,
  type StreamEvents,
} from "@/lib/tool-bridge";

// Только сервер / CLI (`pnpm chat`). Не импортировать из `"use client"`.

/** Сообщение диалога для обоих провайдеров. */
export type CompletionMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Единый запрос к модели.
 * temperature — только если модель принимает (текущие Claude — нет).
 * effort — reasoning / output_config.effort.
 * tools — из реестра; адаптер мапит в формат API.
 */
export type Completion = {
  model?: string;
  system?: string;
  messages: CompletionMessage[];
  maxTokens?: number;
  temperature?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  tools?: Tool[];
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

/** Модель с опубликованной ценой ($ / 1M токенов). Без цены — не угадываем. */
export type Model = {
  id: string;
  inputPerMillion?: number;
  outputPerMillion?: number;
};

export type { StreamEvents, ToolCallEvent } from "@/lib/tool-bridge";

export type Provider = {
  name: string;
  /** Первый элемент — default. */
  models: Model[];
  stream: (
    completion: Completion,
    events: StreamEvents | ((text: string) => void),
  ) => Promise<TokenUsage>;
};

export type ProviderOptions = {
  apiKey?: string;
  /** Подмена fetch — для тестов без сети. */
  fetch?: typeof fetch;
};

function resolveModelId(provider: Provider, modelId?: string): string {
  if (modelId) {
    return modelId;
  }
  const first = provider.models[0];
  if (!first) {
    throw new Error(`${provider.name}: no models configured`);
  }
  return first.id;
}

function addUsage(total: TokenUsage, part: TokenUsage): TokenUsage {
  return {
    inputTokens: total.inputTokens + part.inputTokens,
    outputTokens: total.outputTokens + part.outputTokens,
  };
}

/** Anthropic Messages API за общим Provider. */
export function anthropic(options: ProviderOptions = {}): Provider {
  let client: Anthropic | undefined;

  const getClient = (): Anthropic => {
    // Лениво: без ключа ошибка только на запросе, не при выборе провайдера
    if (!client) {
      const apiKey = options.apiKey ?? config.anthropicApiKey;
      client = new Anthropic({
        apiKey,
        maxRetries: 3,
        ...(options.fetch ? { fetch: options.fetch } : {}),
      });
    }
    return client;
  };

  const provider: Provider = {
    name: "anthropic",
    models: [
      {
        id: "claude-haiku-4-5-20251001",
        inputPerMillion: 1,
        outputPerMillion: 5,
      },
      {
        id: "claude-sonnet-4-5-20250929",
        inputPerMillion: 3,
        outputPerMillion: 15,
      },
    ],
    async stream(completion, eventsInput) {
      const events = normalizeStreamEvents(eventsInput);
      const model = resolveModelId(provider, completion.model);
      const tools = completion.tools ?? [];
      const apiTools = tools.length > 0 ? toAnthropicTools(tools) : undefined;

      const messages: Anthropic.MessageParam[] = completion.messages.map(
        (message) => ({
          role: message.role,
          content: message.content,
        }),
      );

      let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        const body: Anthropic.MessageCreateParams = {
          model,
          max_tokens: completion.maxTokens ?? 1024,
          system: completion.system,
          messages,
          ...(apiTools ? { tools: apiTools } : {}),
        };

        if (completion.effort) {
          body.output_config = { effort: completion.effort };
        }

        const stream = getClient().messages.stream(body);
        stream.on("text", (text) => {
          events.text(text);
        });

        const finalMessage = await stream.finalMessage();
        usage = addUsage(usage, {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        });

        // Только stop_reason tool_use запускает tools; max_tokens mid-call — стоп
        if (finalMessage.stop_reason !== "tool_use") {
          return usage;
        }

        const toolUses = finalMessage.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );
        if (toolUses.length === 0) {
          return usage;
        }

        messages.push({
          role: "assistant",
          content: finalMessage.content,
        });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUses) {
          const call = await runToolCall(block.name, block.input);
          events.tool?.(call);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: serializeToolResult(call.result),
            is_error: call.isError || undefined,
          });
        }

        messages.push({ role: "user", content: toolResults });
      }

      return usage;
    },
  };

  return provider;
}

/** OpenAI Responses API за тем же Provider. */
export function openai(options: ProviderOptions = {}): Provider {
  let client: OpenAI | undefined;

  const getClient = (): OpenAI => {
    if (!client) {
      const apiKey = options.apiKey ?? config.openaiApiKey;
      client = new OpenAI({
        apiKey,
        maxRetries: 3,
        ...(options.fetch ? { fetch: options.fetch } : {}),
      });
    }
    return client;
  };

  const provider: Provider = {
    name: "openai",
    models: [
      {
        id: "gpt-4.1-mini",
        inputPerMillion: 0.4,
        outputPerMillion: 1.6,
      },
      {
        id: "gpt-4.1",
        inputPerMillion: 2,
        outputPerMillion: 8,
      },
    ],
    async stream(completion, eventsInput) {
      const events = normalizeStreamEvents(eventsInput);
      const model = resolveModelId(provider, completion.model);
      const tools = completion.tools ?? [];
      const apiTools =
        tools.length > 0 ? toOpenAIFunctionTools(tools) : undefined;

      // История хода: user/assistant + reasoning + function_call(+output)
      let input: OpenAI.Responses.ResponseInput = completion.messages.map(
        (message) => ({
          role: message.role,
          content: message.content,
        }),
      );

      let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        const stream = getClient().responses.stream({
          model,
          instructions: completion.system,
          input,
          max_output_tokens: completion.maxTokens ?? 1024,
          ...(completion.temperature !== undefined
            ? { temperature: completion.temperature }
            : {}),
          ...(completion.effort
            ? { reasoning: { effort: completion.effort } }
            : {}),
          ...(apiTools ? { tools: apiTools } : {}),
        });

        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            events.text(event.delta);
          } else if (event.type === "response.failed") {
            const message =
              event.response.error?.message ?? "OpenAI response failed";
            throw new Error(message);
          }
        }

        const final = await stream.finalResponse();
        usage = addUsage(usage, {
          inputTokens: final.usage?.input_tokens ?? 0,
          outputTokens: final.usage?.output_tokens ?? 0,
        });

        const output = final.output ?? [];
        const functionCalls = output.filter(
          (item) => item.type === "function_call",
        ) as OpenAI.Responses.ResponseFunctionToolCall[];

        if (functionCalls.length === 0) {
          return usage;
        }

        // Incomplete / max tokens mid tool — ничего не запускаем
        const truncated =
          final.status === "incomplete" ||
          functionCalls.some((item) => item.status === "incomplete");
        if (truncated) {
          return usage;
        }

        // Reasoning и прочие items остаются в контексте следующего запроса
        const nextInput: OpenAI.Responses.ResponseInput = [
          ...(output as OpenAI.Responses.ResponseInputItem[]),
        ];

        for (const call of functionCalls) {
          let parsedArgs: unknown = call.arguments;
          try {
            parsedArgs = JSON.parse(call.arguments) as unknown;
          } catch {
            parsedArgs = call.arguments;
          }
          const ran = await runToolCall(call.name, parsedArgs);
          events.tool?.(ran);
          nextInput.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: serializeToolResult(ran.result),
          });
        }

        input = [...input, ...nextInput];
      }

      return usage;
    },
  };

  return provider;
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

type AccumulatedToolCall = {
  id: string;
  name: string;
  arguments: string;
};

/**
 * Groq через OpenAI-compatible Chat Completions.
 * Responses API у Groq ограничен — стримим chat.completions + tools.
 */
export function groq(options: ProviderOptions = {}): Provider {
  let client: OpenAI | undefined;

  const getClient = (): OpenAI => {
    if (!client) {
      const apiKey = options.apiKey ?? config.groqApiKey;
      client = new OpenAI({
        apiKey,
        baseURL: GROQ_BASE_URL,
        maxRetries: 3,
        ...(options.fetch ? { fetch: options.fetch } : {}),
      });
    }
    return client;
  };

  const provider: Provider = {
    name: "groq",
    models: [
      {
        id: "openai/gpt-oss-120b",
        inputPerMillion: 0.15,
        outputPerMillion: 0.6,
      },
    ],
    async stream(completion, eventsInput) {
      const events = normalizeStreamEvents(eventsInput);
      const model = resolveModelId(provider, completion.model);
      const tools = completion.tools ?? [];
      const apiTools =
        tools.length > 0 ? toChatCompletionsTools(tools) : undefined;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (completion.system) {
        messages.push({ role: "system", content: completion.system });
      }
      for (const message of completion.messages) {
        messages.push({ role: message.role, content: message.content });
      }

      let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        const stream = await getClient().chat.completions.create({
          model,
          messages,
          stream: true,
          stream_options: { include_usage: true },
          max_completion_tokens: completion.maxTokens ?? 1024,
          ...(completion.temperature !== undefined
            ? { temperature: completion.temperature }
            : {}),
          ...(completion.effort
            ? {
                reasoning_effort:
                  completion.effort === "xhigh" || completion.effort === "max"
                    ? "high"
                    : completion.effort,
              }
            : {}),
          ...(apiTools ? { tools: apiTools } : {}),
        });

        let finishReason: string | null | undefined;
        let assistantText = "";
        let roundInput = 0;
        let roundOutput = 0;
        const toolCallsByIndex = new Map<number, AccumulatedToolCall>();

        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
          }
          const delta = choice?.delta;
          if (delta?.content) {
            assistantText += delta.content;
            events.text(delta.content);
          }
          if (delta?.tool_calls) {
            for (const part of delta.tool_calls) {
              const index = part.index ?? 0;
              const current = toolCallsByIndex.get(index) ?? {
                id: "",
                name: "",
                arguments: "",
              };
              if (part.id) current.id = part.id;
              if (part.function?.name) current.name = part.function.name;
              if (part.function?.arguments) {
                current.arguments += part.function.arguments;
              }
              toolCallsByIndex.set(index, current);
            }
          }
          if (chunk.usage) {
            roundInput = chunk.usage.prompt_tokens;
            roundOutput = chunk.usage.completion_tokens;
          }
        }

        usage = addUsage(usage, {
          inputTokens: roundInput,
          outputTokens: roundOutput,
        });

        const roundToolCalls = [...toolCallsByIndex.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, call]) => call)
          // Без id нельзя слать role:tool — Groq отклонит весь loop
          .filter((call) => Boolean(call.id && call.name));

        // Только finish_reason tool_calls; length mid-call — стоп без run
        if (finishReason !== "tool_calls" || roundToolCalls.length === 0) {
          return usage;
        }

        messages.push({
          role: "assistant",
          content: assistantText || null,
          tool_calls: roundToolCalls.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: {
              name: call.name,
              arguments: call.arguments,
            },
          })),
        });

        for (const call of roundToolCalls) {
          let parsedArgs: unknown = call.arguments;
          try {
            parsedArgs = JSON.parse(call.arguments) as unknown;
          } catch {
            // невалидный JSON — Zod/runToolCall вернёт isError
          }
          const ran = await runToolCall(call.name, parsedArgs);
          events.tool?.(ran);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: serializeToolResult(ran.result),
          });
        }
      }

      return usage;
    },
  };

  return provider;
}
