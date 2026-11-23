import { describe, expect, it, vi } from "vitest";

import { anthropic, openai } from "./providers";

/** SSE из пар event/data — двойной перевод строки после каждого события. */
function sseBody(events: Array<{ event: string; data: unknown }>): string {
  return events
    .map(
      ({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    )
    .join("");
}

function sseResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "request-id": "test-req",
    },
  });
}

describe("anthropic provider", () => {
  it("стримит text deltas по порядку и берёт usage из финального message", async () => {
    let requestBody: Record<string, unknown> | undefined;

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return sseResponse(
          sseBody([
            {
              event: "message_start",
              data: {
                type: "message_start",
                message: {
                  id: "msg_test",
                  type: "message",
                  role: "assistant",
                  content: [],
                  model: "claude-haiku-4-5-20251001",
                  stop_reason: null,
                  stop_sequence: null,
                  usage: { input_tokens: 12, output_tokens: 0 },
                },
              },
            },
            {
              event: "content_block_start",
              data: {
                type: "content_block_start",
                index: 0,
                content_block: { type: "text", text: "" },
              },
            },
            {
              event: "content_block_delta",
              data: {
                type: "content_block_delta",
                index: 0,
                delta: { type: "text_delta", text: "Hello" },
              },
            },
            {
              event: "content_block_delta",
              data: {
                type: "content_block_delta",
                index: 0,
                delta: { type: "text_delta", text: " world" },
              },
            },
            {
              event: "content_block_stop",
              data: { type: "content_block_stop", index: 0 },
            },
            {
              event: "message_delta",
              data: {
                type: "message_delta",
                delta: { stop_reason: "end_turn", stop_sequence: null },
                usage: { output_tokens: 4 },
              },
            },
            {
              event: "message_stop",
              data: { type: "message_stop" },
            },
          ]),
        );
      },
    );

    const provider = anthropic({
      apiKey: "test-anthropic-key",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const chunks: string[] = [];
    const usage = await provider.stream(
      {
        system: "Be brief.",
        messages: [{ role: "user", content: "Say hi" }],
        maxTokens: 64,
        effort: "low",
      },
      (text) => chunks.push(text),
    );

    expect(chunks).toEqual(["Hello", " world"]);
    expect(usage).toEqual({ inputTokens: 12, outputTokens: 4 });
    expect(requestBody).toMatchObject({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      system: "Be brief.",
      messages: [{ role: "user", content: "Say hi" }],
      output_config: { effort: "low" },
      stream: true,
    });
    expect(requestBody).not.toHaveProperty("temperature");
    expect(provider.models[0]?.id).toBe("claude-haiku-4-5-20251001");
  });

  it("не создаёт SDK до первого stream", () => {
    expect(() => anthropic({ apiKey: undefined })).not.toThrow();
  });
});

describe("openai provider", () => {
  it("стримит deltas, usage из response.completed и верные поля body", async () => {
    let requestBody: Record<string, unknown> | undefined;

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return sseResponse(
          sseBody([
            {
              event: "response.created",
              data: {
                type: "response.created",
                sequence_number: 0,
                response: {
                  id: "resp_test",
                  object: "response",
                  created_at: 1,
                  status: "in_progress",
                  model: "gpt-4.1-mini",
                  output: [],
                  error: null,
                  incomplete_details: null,
                  instructions: null,
                  metadata: {},
                  parallel_tool_calls: true,
                  temperature: 1,
                  tool_choice: "auto",
                  tools: [],
                  top_p: 1,
                  truncation: "disabled",
                  usage: null,
                },
              },
            },
            {
              event: "response.output_item.added",
              data: {
                type: "response.output_item.added",
                sequence_number: 1,
                output_index: 0,
                item: {
                  id: "msg_1",
                  type: "message",
                  role: "assistant",
                  status: "in_progress",
                  content: [],
                },
              },
            },
            {
              event: "response.content_part.added",
              data: {
                type: "response.content_part.added",
                sequence_number: 2,
                item_id: "msg_1",
                output_index: 0,
                content_index: 0,
                part: { type: "output_text", text: "", annotations: [] },
              },
            },
            {
              event: "response.output_text.delta",
              data: {
                type: "response.output_text.delta",
                sequence_number: 3,
                item_id: "msg_1",
                output_index: 0,
                content_index: 0,
                delta: "Hi",
              },
            },
            {
              event: "response.output_text.delta",
              data: {
                type: "response.output_text.delta",
                sequence_number: 4,
                item_id: "msg_1",
                output_index: 0,
                content_index: 0,
                delta: " there",
              },
            },
            {
              event: "response.output_text.done",
              data: {
                type: "response.output_text.done",
                sequence_number: 5,
                item_id: "msg_1",
                output_index: 0,
                content_index: 0,
                text: "Hi there",
              },
            },
            {
              event: "response.content_part.done",
              data: {
                type: "response.content_part.done",
                sequence_number: 6,
                item_id: "msg_1",
                output_index: 0,
                content_index: 0,
                part: {
                  type: "output_text",
                  text: "Hi there",
                  annotations: [],
                },
              },
            },
            {
              event: "response.output_item.done",
              data: {
                type: "response.output_item.done",
                sequence_number: 7,
                output_index: 0,
                item: {
                  id: "msg_1",
                  type: "message",
                  role: "assistant",
                  status: "completed",
                  content: [
                    {
                      type: "output_text",
                      text: "Hi there",
                      annotations: [],
                    },
                  ],
                },
              },
            },
            {
              event: "response.completed",
              data: {
                type: "response.completed",
                sequence_number: 8,
                response: {
                  id: "resp_test",
                  object: "response",
                  created_at: 1,
                  status: "completed",
                  model: "gpt-4.1-mini",
                  output: [
                    {
                      id: "msg_1",
                      type: "message",
                      role: "assistant",
                      status: "completed",
                      content: [
                        {
                          type: "output_text",
                          text: "Hi there",
                          annotations: [],
                        },
                      ],
                    },
                  ],
                  error: null,
                  incomplete_details: null,
                  instructions: null,
                  metadata: {},
                  parallel_tool_calls: true,
                  temperature: 1,
                  tool_choice: "auto",
                  tools: [],
                  top_p: 1,
                  truncation: "disabled",
                  usage: {
                    input_tokens: 9,
                    output_tokens: 3,
                    total_tokens: 12,
                    input_tokens_details: { cached_tokens: 0 },
                    output_tokens_details: { reasoning_tokens: 0 },
                  },
                },
              },
            },
          ]),
        );
      },
    );

    const provider = openai({
      apiKey: "test-openai-key",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const chunks: string[] = [];
    const usage = await provider.stream(
      {
        system: "Be brief.",
        messages: [{ role: "user", content: "Say hi" }],
        maxTokens: 32,
        temperature: 0.2,
        effort: "low",
      },
      (text) => chunks.push(text),
    );

    expect(chunks).toEqual(["Hi", " there"]);
    expect(usage).toEqual({ inputTokens: 9, outputTokens: 3 });
    expect(requestBody).toMatchObject({
      model: "gpt-4.1-mini",
      instructions: "Be brief.",
      max_output_tokens: 32,
      temperature: 0.2,
      reasoning: { effort: "low" },
      stream: true,
    });
    expect(requestBody?.input).toEqual([{ role: "user", content: "Say hi" }]);
    expect(provider.models[0]?.id).toBe("gpt-4.1-mini");
  });

  it("бросает ошибку на response.failed", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse(
        sseBody([
          {
            event: "response.created",
            data: {
              type: "response.created",
              sequence_number: 0,
              response: {
                id: "resp_fail",
                object: "response",
                created_at: 1,
                status: "in_progress",
                model: "gpt-4.1-mini",
                output: [],
                error: null,
                incomplete_details: null,
                instructions: null,
                metadata: {},
                parallel_tool_calls: true,
                temperature: 1,
                tool_choice: "auto",
                tools: [],
                top_p: 1,
                truncation: "disabled",
                usage: null,
              },
            },
          },
          {
            event: "response.failed",
            data: {
              type: "response.failed",
              sequence_number: 1,
              response: {
                id: "resp_fail",
                object: "response",
                created_at: 1,
                status: "failed",
                model: "gpt-4.1-mini",
                output: [],
                error: {
                  code: "server_error",
                  message: "boom from api",
                },
                incomplete_details: null,
                instructions: null,
                metadata: {},
                parallel_tool_calls: true,
                temperature: 1,
                tool_choice: "auto",
                tools: [],
                top_p: 1,
                truncation: "disabled",
                usage: null,
              },
            },
          },
        ]),
      ),
    );

    const provider = openai({
      apiKey: "test-openai-key",
      fetch: fetchMock as unknown as typeof fetch,
    });

    await expect(
      provider.stream(
        { messages: [{ role: "user", content: "x" }] },
        () => undefined,
      ),
    ).rejects.toThrow(/boom from api/);
  });

  it("response.incomplete отдаёт usage (ответ обрезан, не failed)", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse(
        sseBody([
          {
            event: "response.created",
            data: {
              type: "response.created",
              sequence_number: 0,
              response: {
                id: "resp_inc",
                object: "response",
                created_at: 1,
                status: "in_progress",
                model: "gpt-4.1-mini",
                output: [],
                error: null,
                incomplete_details: null,
                instructions: null,
                metadata: {},
                parallel_tool_calls: true,
                temperature: 1,
                tool_choice: "auto",
                tools: [],
                top_p: 1,
                truncation: "disabled",
                usage: null,
              },
            },
          },
          {
            event: "response.output_item.added",
            data: {
              type: "response.output_item.added",
              sequence_number: 1,
              output_index: 0,
              item: {
                id: "msg_1",
                type: "message",
                role: "assistant",
                status: "in_progress",
                content: [],
              },
            },
          },
          {
            event: "response.content_part.added",
            data: {
              type: "response.content_part.added",
              sequence_number: 2,
              item_id: "msg_1",
              output_index: 0,
              content_index: 0,
              part: { type: "output_text", text: "", annotations: [] },
            },
          },
          {
            event: "response.output_text.delta",
            data: {
              type: "response.output_text.delta",
              sequence_number: 3,
              item_id: "msg_1",
              output_index: 0,
              content_index: 0,
              delta: "partial",
            },
          },
          {
            event: "response.incomplete",
            data: {
              type: "response.incomplete",
              sequence_number: 4,
              response: {
                id: "resp_inc",
                object: "response",
                created_at: 1,
                status: "incomplete",
                model: "gpt-4.1-mini",
                output: [
                  {
                    id: "msg_1",
                    type: "message",
                    role: "assistant",
                    status: "incomplete",
                    content: [
                      {
                        type: "output_text",
                        text: "partial",
                        annotations: [],
                      },
                    ],
                  },
                ],
                error: null,
                incomplete_details: { reason: "max_output_tokens" },
                instructions: null,
                metadata: {},
                parallel_tool_calls: true,
                temperature: 1,
                tool_choice: "auto",
                tools: [],
                top_p: 1,
                truncation: "disabled",
                usage: {
                  input_tokens: 5,
                  output_tokens: 1,
                  total_tokens: 6,
                  input_tokens_details: { cached_tokens: 0 },
                  output_tokens_details: { reasoning_tokens: 0 },
                },
              },
            },
          },
        ]),
      ),
    );

    const provider = openai({
      apiKey: "test-openai-key",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const chunks: string[] = [];
    const usage = await provider.stream(
      { messages: [{ role: "user", content: "x" }], maxTokens: 1 },
      (text) => chunks.push(text),
    );

    expect(chunks).toEqual(["partial"]);
    expect(usage).toEqual({ inputTokens: 5, outputTokens: 1 });
  });

  it("не создаёт SDK до первого stream", () => {
    expect(() => openai({ apiKey: undefined })).not.toThrow();
  });
});
