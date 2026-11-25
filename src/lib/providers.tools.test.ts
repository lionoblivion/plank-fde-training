import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

import { anthropic, groq, openai } from "./providers";
import { tool } from "./tool-def";
import { registerDefaultTools, registerTool, resetToolRegistry } from "./tools";

/** SSE из пар event/data. */
function sseBody(events: Array<{ event: string; data: unknown }>): string {
  return events
    .map(
      ({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    )
    .join("");
}

function chatSseBody(chunks: unknown[]): string {
  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
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

const calcTool = tool({
  name: "calculator",
  description: "Call for any math",
  input: z.object({ expression: z.string() }),
  run: ({ expression }) => ({ expression, value: 42 }),
});

beforeEach(() => {
  resetToolRegistry();
  registerTool(calcTool);
});

afterEach(() => {
  resetToolRegistry();
  registerDefaultTools();
});

describe("anthropic tool loop", () => {
  it("round-trip: tool_use → tool_result в одном user message", async () => {
    const bodies: Record<string, unknown>[] = [];
    let call = 0;

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        call += 1;
        if (call === 1) {
          return sseResponse(
            sseBody([
              {
                event: "message_start",
                data: {
                  type: "message_start",
                  message: {
                    id: "msg_1",
                    type: "message",
                    role: "assistant",
                    content: [],
                    model: "claude-haiku-4-5-20251001",
                    stop_reason: null,
                    stop_sequence: null,
                    usage: { input_tokens: 20, output_tokens: 0 },
                  },
                },
              },
              {
                event: "content_block_start",
                data: {
                  type: "content_block_start",
                  index: 0,
                  content_block: {
                    type: "tool_use",
                    id: "toolu_1",
                    name: "calculator",
                    input: {},
                  },
                },
              },
              {
                event: "content_block_delta",
                data: {
                  type: "content_block_delta",
                  index: 0,
                  delta: {
                    type: "input_json_delta",
                    partial_json: '{"expression":"2+2"}',
                  },
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
                  delta: { stop_reason: "tool_use", stop_sequence: null },
                  usage: { output_tokens: 8 },
                },
              },
              { event: "message_stop", data: { type: "message_stop" } },
            ]),
          );
        }

        return sseResponse(
          sseBody([
            {
              event: "message_start",
              data: {
                type: "message_start",
                message: {
                  id: "msg_2",
                  type: "message",
                  role: "assistant",
                  content: [],
                  model: "claude-haiku-4-5-20251001",
                  stop_reason: null,
                  stop_sequence: null,
                  usage: { input_tokens: 30, output_tokens: 0 },
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
                delta: { type: "text_delta", text: "42" },
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
                usage: { output_tokens: 2 },
              },
            },
            { event: "message_stop", data: { type: "message_stop" } },
          ]),
        );
      },
    );

    const toolEvents: Array<{ name: string; isError: boolean }> = [];
    const chunks: string[] = [];
    const usage = await anthropic({
      apiKey: "test",
      fetch: fetchMock as unknown as typeof fetch,
    }).stream(
      {
        messages: [{ role: "user", content: "2+2?" }],
        tools: [calcTool],
      },
      {
        text: (t) => chunks.push(t),
        tool: (c) => toolEvents.push({ name: c.name, isError: c.isError }),
      },
    );

    expect(toolEvents).toEqual([{ name: "calculator", isError: false }]);
    expect(chunks).toEqual(["42"]);
    expect(usage).toEqual({ inputTokens: 50, outputTokens: 10 });

    const second = bodies[1];
    expect(second?.messages).toEqual([
      { role: "user", content: "2+2?" },
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "calculator",
            input: { expression: "2+2" },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_1",
            content: JSON.stringify({ expression: "2+2", value: 42 }),
          },
        ],
      },
    ]);
  });

  it("max_tokens mid tool_use — tool не запускается", async () => {
    const runSpy = vi.fn(() => ({ value: 1 }));
    resetToolRegistry();
    registerTool(
      tool({
        name: "calculator",
        description: "math",
        input: z.object({ expression: z.string() }),
        run: runSpy,
      }),
    );

    const fetchMock = vi.fn(async () =>
      sseResponse(
        sseBody([
          {
            event: "message_start",
            data: {
              type: "message_start",
              message: {
                id: "msg_cut",
                type: "message",
                role: "assistant",
                content: [],
                model: "claude-haiku-4-5-20251001",
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 5, output_tokens: 0 },
              },
            },
          },
          {
            event: "content_block_start",
            data: {
              type: "content_block_start",
              index: 0,
              content_block: {
                type: "tool_use",
                id: "toolu_x",
                name: "calculator",
                input: {},
              },
            },
          },
          {
            event: "content_block_delta",
            data: {
              type: "content_block_delta",
              index: 0,
              delta: {
                type: "input_json_delta",
                partial_json: '{"expression":"1',
              },
            },
          },
          {
            event: "message_delta",
            data: {
              type: "message_delta",
              delta: { stop_reason: "max_tokens", stop_sequence: null },
              usage: { output_tokens: 3 },
            },
          },
          { event: "message_stop", data: { type: "message_stop" } },
        ]),
      ),
    );

    await anthropic({
      apiKey: "test",
      fetch: fetchMock as unknown as typeof fetch,
    }).stream(
      {
        messages: [{ role: "user", content: "calc" }],
        tools: [calcTool],
        maxTokens: 1,
      },
      () => undefined,
    );

    expect(runSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("openai tool loop", () => {
  it("round-trip: function_call → function_call_output по call_id", async () => {
    const bodies: Record<string, unknown>[] = [];
    let call = 0;

    const baseResponse = {
      id: "resp_1",
      object: "response",
      created_at: 1,
      model: "gpt-4.1-mini",
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
    };

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        call += 1;
        if (call === 1) {
          return sseResponse(
            sseBody([
              {
                event: "response.created",
                data: {
                  type: "response.created",
                  sequence_number: 0,
                  response: {
                    ...baseResponse,
                    status: "in_progress",
                    output: [],
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
                    type: "function_call",
                    id: "fc_1",
                    call_id: "call_abc",
                    name: "calculator",
                    arguments: "",
                    status: "in_progress",
                  },
                },
              },
              {
                event: "response.output_item.done",
                data: {
                  type: "response.output_item.done",
                  sequence_number: 2,
                  output_index: 0,
                  item: {
                    type: "function_call",
                    id: "fc_1",
                    call_id: "call_abc",
                    name: "calculator",
                    arguments: '{"expression":"3*3"}',
                    status: "completed",
                  },
                },
              },
              {
                event: "response.completed",
                data: {
                  type: "response.completed",
                  sequence_number: 3,
                  response: {
                    ...baseResponse,
                    status: "completed",
                    output: [
                      {
                        type: "function_call",
                        id: "fc_1",
                        call_id: "call_abc",
                        name: "calculator",
                        arguments: '{"expression":"3*3"}',
                        status: "completed",
                      },
                    ],
                    usage: {
                      input_tokens: 10,
                      output_tokens: 5,
                      total_tokens: 15,
                      input_tokens_details: { cached_tokens: 0 },
                      output_tokens_details: { reasoning_tokens: 0 },
                    },
                  },
                },
              },
            ]),
          );
        }

        return sseResponse(
          sseBody([
            {
              event: "response.created",
              data: {
                type: "response.created",
                sequence_number: 0,
                response: {
                  ...baseResponse,
                  id: "resp_2",
                  status: "in_progress",
                  output: [],
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
                delta: "9",
              },
            },
            {
              event: "response.output_item.done",
              data: {
                type: "response.output_item.done",
                sequence_number: 4,
                output_index: 0,
                item: {
                  id: "msg_1",
                  type: "message",
                  role: "assistant",
                  status: "completed",
                  content: [
                    {
                      type: "output_text",
                      text: "9",
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
                sequence_number: 5,
                response: {
                  ...baseResponse,
                  id: "resp_2",
                  status: "completed",
                  output: [
                    {
                      id: "msg_1",
                      type: "message",
                      role: "assistant",
                      status: "completed",
                      content: [
                        {
                          type: "output_text",
                          text: "9",
                          annotations: [],
                        },
                      ],
                    },
                  ],
                  usage: {
                    input_tokens: 20,
                    output_tokens: 1,
                    total_tokens: 21,
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

    const toolEvents: string[] = [];
    const chunks: string[] = [];
    await openai({
      apiKey: "test",
      fetch: fetchMock as unknown as typeof fetch,
    }).stream(
      {
        messages: [{ role: "user", content: "3*3" }],
        tools: [calcTool],
      },
      {
        text: (t) => chunks.push(t),
        tool: (c) => toolEvents.push(c.name),
      },
    );

    expect(toolEvents).toEqual(["calculator"]);
    expect(chunks).toEqual(["9"]);

    const secondInput = bodies[1]?.input as unknown[];
    expect(secondInput).toContainEqual(
      expect.objectContaining({
        type: "function_call",
        call_id: "call_abc",
        name: "calculator",
        arguments: '{"expression":"3*3"}',
      }),
    );
    expect(secondInput).toContainEqual({
      type: "function_call_output",
      call_id: "call_abc",
      output: JSON.stringify({ expression: "3*3", value: 42 }),
    });
  });

  it("incomplete function_call — tool не запускается", async () => {
    const runSpy = vi.fn(() => ({ value: 1 }));
    resetToolRegistry();
    registerTool(
      tool({
        name: "calculator",
        description: "math",
        input: z.object({ expression: z.string() }),
        run: runSpy,
      }),
    );

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
            event: "response.incomplete",
            data: {
              type: "response.incomplete",
              sequence_number: 1,
              response: {
                id: "resp_inc",
                object: "response",
                created_at: 1,
                status: "incomplete",
                model: "gpt-4.1-mini",
                output: [
                  {
                    type: "function_call",
                    id: "fc_x",
                    call_id: "call_x",
                    name: "calculator",
                    arguments: '{"expression":"1',
                    status: "incomplete",
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
                  input_tokens: 4,
                  output_tokens: 2,
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

    await openai({
      apiKey: "test",
      fetch: fetchMock as unknown as typeof fetch,
    }).stream(
      {
        messages: [{ role: "user", content: "x" }],
        tools: [calcTool],
        maxTokens: 1,
      },
      () => undefined,
    );

    expect(runSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("groq tool loop", () => {
  it("round-trip: tool_calls → role:tool сообщения", async () => {
    const bodies: Record<string, unknown>[] = [];
    let call = 0;

    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        call += 1;
        if (call === 1) {
          return sseResponse(
            chatSseBody([
              {
                id: "chatcmpl_1",
                object: "chat.completion.chunk",
                created: 1,
                model: "openai/gpt-oss-120b",
                choices: [
                  {
                    index: 0,
                    delta: {
                      role: "assistant",
                      tool_calls: [
                        {
                          index: 0,
                          id: "call_g1",
                          type: "function",
                          function: { name: "calculator", arguments: "" },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              },
              {
                id: "chatcmpl_1",
                object: "chat.completion.chunk",
                created: 1,
                model: "openai/gpt-oss-120b",
                choices: [
                  {
                    index: 0,
                    delta: {
                      tool_calls: [
                        {
                          index: 0,
                          function: { arguments: '{"expression":"5+5"}' },
                        },
                      ],
                    },
                    finish_reason: null,
                  },
                ],
              },
              {
                id: "chatcmpl_1",
                object: "chat.completion.chunk",
                created: 1,
                model: "openai/gpt-oss-120b",
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: "tool_calls",
                  },
                ],
              },
              {
                id: "chatcmpl_1",
                object: "chat.completion.chunk",
                created: 1,
                model: "openai/gpt-oss-120b",
                choices: [],
                usage: {
                  prompt_tokens: 15,
                  completion_tokens: 8,
                  total_tokens: 23,
                },
              },
            ]),
          );
        }

        return sseResponse(
          chatSseBody([
            {
              id: "chatcmpl_2",
              object: "chat.completion.chunk",
              created: 1,
              model: "openai/gpt-oss-120b",
              choices: [
                {
                  index: 0,
                  delta: { role: "assistant", content: "10" },
                  finish_reason: null,
                },
              ],
            },
            {
              id: "chatcmpl_2",
              object: "chat.completion.chunk",
              created: 1,
              model: "openai/gpt-oss-120b",
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            },
            {
              id: "chatcmpl_2",
              object: "chat.completion.chunk",
              created: 1,
              model: "openai/gpt-oss-120b",
              choices: [],
              usage: {
                prompt_tokens: 40,
                completion_tokens: 1,
                total_tokens: 41,
              },
            },
          ]),
        );
      },
    );

    const chunks: string[] = [];
    const tools: string[] = [];
    await groq({
      apiKey: "test",
      fetch: fetchMock as unknown as typeof fetch,
    }).stream(
      {
        messages: [{ role: "user", content: "5+5" }],
        tools: [calcTool],
      },
      {
        text: (t) => chunks.push(t),
        tool: (c) => tools.push(c.name),
      },
    );

    expect(tools).toEqual(["calculator"]);
    expect(chunks).toEqual(["10"]);

    const secondMessages = bodies[1]?.messages as unknown[];
    expect(secondMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          tool_calls: [
            {
              id: "call_g1",
              type: "function",
              function: {
                name: "calculator",
                arguments: '{"expression":"5+5"}',
              },
            },
          ],
        }),
        {
          role: "tool",
          tool_call_id: "call_g1",
          content: JSON.stringify({ expression: "5+5", value: 42 }),
        },
      ]),
    );
  });
});
