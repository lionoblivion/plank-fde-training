import { describe, expect, it } from "vitest";

import { groq } from "@/lib/providers";
import { research } from "@/lib/research";
import { Session } from "@/lib/session";

/**
 * Live: small model в обеих ролях (у Groq одна модель в списке).
 * Проверяем цитату refunds / $200.
 */
describe("research live", () => {
  it("отвечает про refund limit и цитирует политику", async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY нужен для pnpm test:live");
    }

    const provider = groq({ apiKey });
    const session = new Session(
      provider,
      provider.models[0]!.id,
      "You help WorkBot support.",
      { tools: [] },
    );

    const steps: string[] = [];
    let answer = "";

    await research(
      "How much can a support agent refund without approval?",
      provider,
      {
        step: (m) => steps.push(m),
        text: (d) => {
          answer += d;
        },
        spend: (model, usage) => session.record(model, usage),
      },
    );

    expect(steps.length).toBeGreaterThan(2);
    expect(answer).toMatch(/\$?\s*200/);
    // Модель иногда ставит 【1】 вместо [1] — принимаем оба и numbered Sources
    expect(answer).toMatch(/\[1\]|【1】|Sources[\s\S]*refunds/i);
    expect(answer.toLowerCase()).toMatch(/refund/);

    const cost = session.cost();
    expect(cost.inputTokens).toBeGreaterThan(0);
    expect(cost.outputTokens).toBeGreaterThan(0);
    expect(session.messages).toEqual([]);
  }, 180_000);
});
