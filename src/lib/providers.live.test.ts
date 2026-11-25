import { describe, expect, it } from "vitest";

import { groq } from "@/lib/providers";
import { calculatorTool } from "@/lib/tools/calculator";
import {
  registerDefaultTools,
  registerTool,
  resetToolRegistry,
} from "@/lib/tools";

/**
 * Live на маленькой модели проекта: Groq `openai/gpt-oss-120b`
 * (вместо Anthropic Haiku — нет credits).
 */
describe("providers live", () => {
  it("groq отвечает на простой вопрос и отдаёт usage", async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY нужен для pnpm test:live");
    }

    const chunks: string[] = [];
    const usage = await groq({ apiKey }).stream(
      {
        model: "openai/gpt-oss-120b",
        system: "Answer in one word.",
        messages: [
          {
            role: "user",
            content: "What color is a clear daytime sky?",
          },
        ],
        maxTokens: 32,
        effort: "low",
      },
      (text) => chunks.push(text),
    );

    const reply = chunks.join("").toLowerCase();
    expect(reply).toMatch(/blue|синий|голубой/);
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
  });

  it("groq считает 1234 * 5678 через calculator", async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY нужен для pnpm test:live");
    }

    resetToolRegistry();
    registerTool(calculatorTool);

    const toolNames: string[] = [];
    const chunks: string[] = [];
    try {
      await groq({ apiKey }).stream(
        {
          model: "openai/gpt-oss-120b",
          system:
            "You are a helpful assistant. For any arithmetic, you must call the calculator tool. After the tool returns, reply with only the numeric result.",
          messages: [
            {
              role: "user",
              content: "What is 1234 * 5678?",
            },
          ],
          maxTokens: 512,
          effort: "low",
          tools: [calculatorTool],
        },
        {
          text: (t) => chunks.push(t),
          tool: (call) => toolNames.push(call.name),
        },
      );
    } finally {
      resetToolRegistry();
      registerDefaultTools();
    }

    expect(toolNames).toContain("calculator");
    const reply = chunks.join("");
    expect(reply.replace(/[\s,]/g, "")).toMatch(/7006652/);
  });
});
