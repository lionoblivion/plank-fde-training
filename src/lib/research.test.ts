import { describe, expect, it } from "vitest";

import type { Completion, Provider, TokenUsage } from "@/lib/providers";
import {
  extractJsonObject,
  research,
  resolveResearchModels,
} from "@/lib/research";
import { Session } from "@/lib/session";

type ScriptTurn = {
  /** Ожидаемая модель этого вызова */
  expectModel: string;
  text: string;
  usage?: TokenUsage;
};

function scriptedProvider(turns: ScriptTurn[]): Provider & {
  calls: Completion[];
} {
  const calls: Completion[] = [];
  let i = 0;
  const provider: Provider & { calls: Completion[] } = {
    name: "script",
    models: [
      {
        id: "small-model",
        inputPerMillion: 0.1,
        outputPerMillion: 0.5,
      },
      {
        id: "large-model",
        inputPerMillion: 2,
        outputPerMillion: 10,
      },
    ],
    calls,
    async stream(completion, events) {
      calls.push(completion);
      const turn = turns[i];
      if (!turn) {
        throw new Error(`Unexpected stream call #${i + 1}`);
      }
      i += 1;
      expect(completion.model).toBe(turn.expectModel);
      const onText = typeof events === "function" ? events : events.text;
      onText(turn.text);
      return turn.usage ?? { inputTokens: 3, outputTokens: 2 };
    },
  };
  return provider;
}

describe("extractJsonObject", () => {
  it("парсит fence и голый объект", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(
      extractJsonObject('Here:\n```json\n{"policies":[],"searches":[]}\n```'),
    ).toEqual({ policies: [], searches: [] });
  });
});

describe("resolveResearchModels", () => {
  it("берёт small и large из списка провайдера", () => {
    const provider = scriptedProvider([]);
    expect(resolveResearchModels(provider)).toEqual({
      small: "small-model",
      large: "large-model",
    });
  });
});

describe("research chain", () => {
  it("шаги, модели, цитаты; plan retry при битом JSON", async () => {
    const provider = scriptedProvider([
      {
        expectModel: "small-model",
        text: "not json at all",
        usage: { inputTokens: 10, outputTokens: 4 },
      },
      {
        expectModel: "small-model",
        text: JSON.stringify({
          policies: ["refunds"],
          searches: ["ignored without key"],
        }),
        usage: { inputTokens: 12, outputTokens: 6 },
      },
      {
        expectModel: "large-model",
        text: "- Support agents may refund up to $200 without approval.",
        usage: { inputTokens: 40, outputTokens: 20 },
      },
      {
        expectModel: "large-model",
        text: "A support agent may refund up to $200 without approval [1].\n\nSources\n[1] Customer refunds — /policies/refunds",
        usage: { inputTokens: 50, outputTokens: 30 },
      },
    ]);

    const steps: string[] = [];
    const spends: Array<{ model: string; usage: TokenUsage }> = [];
    let answer = "";

    const result = await research(
      "How much can a support agent refund without approval?",
      provider,
      {
        step: (m) => steps.push(m),
        text: (d) => {
          answer += d;
        },
        spend: (model, usage) => spends.push({ model, usage }),
      },
    );

    expect(steps[0]).toMatch(/Planning/i);
    expect(steps.some((s) => /Re-planning/i.test(s))).toBe(true);
    expect(steps.some((s) => /Gathering/i.test(s))).toBe(true);
    expect(steps.some((s) => /Extracting/i.test(s))).toBe(true);
    expect(steps.some((s) => /Writing/i.test(s))).toBe(true);

    expect(provider.calls.map((c) => c.model)).toEqual([
      "small-model",
      "small-model",
      "large-model",
      "large-model",
    ]);

    expect(result).toContain("$200");
    expect(result).toContain("[1]");
    expect(result).toMatch(/Sources/i);
    expect(answer).toBe(result);

    expect(spends).toHaveLength(4);
    expect(spends[0]?.model).toBe("small-model");
    expect(spends[2]?.model).toBe("large-model");
  });

  it("Session.record учитывает spend в /cost", async () => {
    const provider = scriptedProvider([
      {
        expectModel: "small-model",
        text: JSON.stringify({ policies: ["refunds"], searches: [] }),
      },
      {
        expectModel: "large-model",
        text: "- Up to $200 [fact]",
      },
      {
        expectModel: "large-model",
        text: "Limit is $200 [1].\n\nSources\n[1] Customer refunds",
      },
    ]);

    const session = new Session(provider, "small-model", "sys", {
      tools: [],
    });
    await research("refund limit?", provider, {
      step: () => undefined,
      text: () => undefined,
      spend: (model, usage) => session.record(model, usage),
    });

    expect(session.messages).toEqual([]);
    const cost = session.cost();
    expect(cost.inputTokens).toBe(9);
    expect(cost.outputTokens).toBe(6);
    expect(cost.dollars).toBeGreaterThan(0);
  });

  it("после двух невалидных планов бросает с текстом модели", async () => {
    const provider = scriptedProvider([
      { expectModel: "small-model", text: "oops" },
      { expectModel: "small-model", text: "still bad {{{" },
    ]);

    await expect(
      research("q", provider, {
        step: () => undefined,
        text: () => undefined,
        spend: () => undefined,
      }),
    ).rejects.toThrow(/Invalid research plan after retry[\s\S]*still bad/);
  });
});

describe("Session.record", () => {
  it("не трогает messages", () => {
    const provider = scriptedProvider([]);
    const session = new Session(provider, "small-model", "sys");
    session.record("small-model", { inputTokens: 100, outputTokens: 50 });
    expect(session.messages).toEqual([]);
    expect(session.turns).toHaveLength(1);
  });
});
