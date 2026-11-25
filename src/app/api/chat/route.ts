import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type LanguageModel,
} from "ai";

import { chatModel, chatTools } from "@/lib/chat";
import { systemPrompt } from "@/lib/system-prompt";
// Регистрация Day 7 tools
import "@/lib/tools";

import { chatErrorResponseSchema, chatRequestSchema } from "./types";

/** Tool loop на большой модели может идти дольше дефолтного лимита Vercel. */
export const maxDuration = 60;

function jsonError(message: string, status = 400): Response {
  const body = chatErrorResponseSchema.parse({ error: message });
  return Response.json(body, { status });
}

/**
 * Стрим UI messages для useChat.
 * model — только для тестов (MockLanguageModel).
 */
export async function streamChat(
  body: unknown,
  options: { model?: LanguageModel } = {},
): Promise<Response> {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    return jsonError(`Некорректное тело запроса: ${detail}`);
  }

  const tools = chatTools();
  const validated = await safeValidateUIMessages({
    messages: parsed.data.messages,
    tools,
  });

  if (!validated.success) {
    return jsonError(
      `Некорректные messages: ${validated.error.message || String(validated.error)}`,
    );
  }

  const modelMessages = await convertToModelMessages(validated.data, {
    tools,
  });

  const result = streamText({
    model: options.model ?? chatModel(),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: isStepCount(8),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Некорректный JSON");
  }

  return streamChat(json);
}
