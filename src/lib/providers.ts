import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { config } from "@/lib/config";

/** Сообщение диалога для обоих провайдеров. */
export type CompletionMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Единый запрос к модели.
 * temperature — только если модель принимает (текущие Claude — нет).
 * effort — reasoning / output_config.effort.
 */
export type Completion = {
  model?: string;
  system?: string;
  messages: CompletionMessage[];
  maxTokens?: number;
  temperature?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
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

export type Provider = {
  name: string;
  /** Первый элемент — default. */
  models: Model[];
  stream: (
    completion: Completion,
    onText: (text: string) => void,
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
    async stream(completion, onText) {
      const model = resolveModelId(provider, completion.model);
      const body: Anthropic.MessageCreateParams = {
        model,
        max_tokens: completion.maxTokens ?? 1024,
        system: completion.system,
        messages: completion.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };

      // Текущие Claude отвергают temperature — не передаём
      if (completion.effort) {
        body.output_config = { effort: completion.effort };
      }

      const stream = getClient().messages.stream(body);
      stream.on("text", (text) => {
        onText(text);
      });

      const finalMessage = await stream.finalMessage();
      return {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      };
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
    async stream(completion, onText) {
      const model = resolveModelId(provider, completion.model);

      const stream = getClient().responses.stream({
        model,
        instructions: completion.system,
        input: completion.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        max_output_tokens: completion.maxTokens ?? 1024,
        ...(completion.temperature !== undefined
          ? { temperature: completion.temperature }
          : {}),
        ...(completion.effort
          ? { reasoning: { effort: completion.effort } }
          : {}),
      });

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          onText(event.delta);
        } else if (event.type === "response.failed") {
          const message =
            event.response.error?.message ?? "OpenAI response failed";
          throw new Error(message);
        } else if (
          event.type === "response.completed" ||
          event.type === "response.incomplete"
        ) {
          const usage = event.response.usage;
          return {
            inputTokens: usage?.input_tokens ?? 0,
            outputTokens: usage?.output_tokens ?? 0,
          };
        }
      }

      const final = await stream.finalResponse();
      return {
        inputTokens: final.usage?.input_tokens ?? 0,
        outputTokens: final.usage?.output_tokens ?? 0,
      };
    },
  };

  return provider;
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/**
 * Groq через OpenAI-compatible Chat Completions.
 * Responses API у Groq ограничен — стримим chat.completions.
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
    async stream(completion, onText) {
      const model = resolveModelId(provider, completion.model);
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (completion.system) {
        messages.push({ role: "system", content: completion.system });
      }
      for (const message of completion.messages) {
        messages.push({ role: message.role, content: message.content });
      }

      const stream = await getClient().chat.completions.create({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: completion.maxTokens ?? 1024,
        ...(completion.temperature !== undefined
          ? { temperature: completion.temperature }
          : {}),
        // gpt-oss принимает только low|medium|high
        ...(completion.effort
          ? {
              reasoning_effort:
                completion.effort === "xhigh" || completion.effort === "max"
                  ? "high"
                  : completion.effort,
            }
          : {}),
      });

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          onText(text);
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      }

      return { inputTokens, outputTokens };
    },
  };

  return provider;
}
