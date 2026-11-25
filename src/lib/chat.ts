import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { tool as sdkTool, type LanguageModel, type ToolSet } from "ai";

import { config } from "@/lib/config";
import { anthropic, groq, openai } from "@/lib/providers";
import { listTools } from "@/lib/tools";

/** Имя провайдера для веб-чата (как CLI; по умолчанию groq). */
export type ChatProviderName = "groq" | "anthropic" | "openai";

function resolveChatProviderName(): ChatProviderName {
  const raw = (config.chatProvider ?? "groq").toLowerCase();
  if (raw === "anthropic" || raw === "openai" || raw === "groq") {
    return raw;
  }
  throw new Error(
    `Unknown CHAT_PROVIDER "${config.chatProvider}". Use groq|anthropic|openai`,
  );
}

/**
 * Default-модель Day 6 списка провайдера, либо CHAT_MODEL.
 * Адаптер AI SDK — тот же провайдер, что и терминал.
 */
export function chatModel(): LanguageModel {
  const name = resolveChatProviderName();
  const override = config.chatModel?.trim() || undefined;

  if (name === "anthropic") {
    const listed = anthropic().models[0]?.id;
    const modelId = override ?? listed;
    if (!modelId) {
      throw new Error("anthropic: no models configured");
    }
    return createAnthropic({ apiKey: config.anthropicApiKey })(modelId);
  }

  if (name === "openai") {
    const listed = openai().models[0]?.id;
    const modelId = override ?? listed;
    if (!modelId) {
      throw new Error("openai: no models configured");
    }
    return createOpenAI({ apiKey: config.openaiApiKey })(modelId);
  }

  const listed = groq().models[0]?.id;
  const modelId = override ?? listed;
  if (!modelId) {
    throw new Error("groq: no models configured");
  }
  return createGroq({ apiKey: config.groqApiKey })(modelId);
}

/**
 * Реестр Day 7 → AI SDK `tool()`.
 * Schema и execute — те же определения, что у терминала.
 */
export function chatTools(): ToolSet {
  const tools: ToolSet = {};
  for (const def of listTools()) {
    tools[def.name] = sdkTool({
      description: def.description,
      inputSchema: def.input,
      execute: async (input: unknown) => def.run(input),
    });
  }
  return tools;
}
