import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";

import { POST, streamChat } from "./route";

function userMessage(text: string) {
  return {
    id: "msg_user_1",
    role: "user" as const,
    parts: [{ type: "text" as const, text }],
  };
}

describe("POST /api/chat", () => {
  it("стримит UI message stream с текстом", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "Hello" },
            { type: "text-delta", id: "text-1", delta: " WorkBot" },
            { type: "text-end", id: "text-1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: {
                  total: 3,
                  noCache: 3,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 2, reasoning: 0, text: 2 },
                totalTokens: 5,
              },
              rawFinishReason: undefined,
            },
          ],
        }),
      }),
    });

    const response = await streamChat(
      {
        id: "chat_1",
        messages: [userMessage("Say hi")],
      },
      { model },
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('"type":"text-delta"');
    expect(body).toContain("Hello");
    expect(body).toContain("WorkBot");
    expect(body).toContain("[DONE]");
  });

  it("400 без id", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMessage("hi")],
        }),
      }),
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toMatch(/id/i);
  });

  it("400 если у message нет parts", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "chat_bad",
          messages: [{ id: "m1", role: "user" }],
        }),
      }),
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toMatch(/messages|parts|Invalid/i);
  });
});
