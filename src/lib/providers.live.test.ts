import { describe, expect, it } from "vitest";

import { groq } from "@/lib/providers";

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
});
