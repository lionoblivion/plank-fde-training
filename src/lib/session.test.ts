import { describe, expect, it, vi } from "vitest";

import type { Provider } from "@/lib/providers";
import { Session } from "@/lib/session";

function fakeProvider(
  reply: string,
  usage = { inputTokens: 10, outputTokens: 5 },
  fail = false,
): Provider {
  return {
    name: "fake",
    models: [
      {
        id: "fake-small",
        inputPerMillion: 1,
        outputPerMillion: 2,
      },
      { id: "fake-unpriced" },
    ],
    async stream(_completion, onText) {
      if (fail) {
        throw new Error("boom");
      }
      onText(reply);
      return usage;
    },
  };
}

describe("Session", () => {
  it("хранит историю user/assistant после send", async () => {
    const session = new Session(
      fakeProvider("hello"),
      "fake-small",
      "Be brief.",
    );
    await session.send("Hi", () => undefined);
    expect(session.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("не пишет в историю при ошибке хода", async () => {
    const session = new Session(
      fakeProvider("x", { inputTokens: 1, outputTokens: 1 }, true),
      "fake-small",
      "sys",
    );
    await expect(session.send("Hi", () => undefined)).rejects.toThrow(/boom/);
    expect(session.messages).toEqual([]);
    expect(session.turns).toEqual([]);
  });

  it("cost считает $ по модели ответа и помечает unpriced", async () => {
    const provider = fakeProvider("ok", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    const session = new Session(provider, "fake-small", "sys");
    await session.send("a", () => undefined);
    expect(session.cost()).toEqual({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      dollars: 3,
      unpricedModels: [],
    });

    session.use(provider, "fake-unpriced");
    await session.send("b", () => undefined);
    const cost = session.cost();
    // Priced-ходы остаются в $; unpriced только именуются
    expect(cost.dollars).toBe(3);
    expect(cost.inputTokens).toBe(2_000_000);
    expect(cost.unpricedModels).toContain("fake-unpriced");
  });

  it("use переключает модель mid-conversation", async () => {
    const provider = fakeProvider("ok");
    const session = new Session(provider, "fake-small", "sys");
    await session.send("one", () => undefined);
    session.use(provider, "fake-unpriced");
    await session.send("two", () => undefined);
    expect(session.model).toBe("fake-unpriced");
    expect(session.messages).toHaveLength(4);
  });

  it("передаёт system и историю в stream", async () => {
    const stream = vi.fn(async (completion, onText) => {
      expect(completion.system).toBe("sys");
      expect(completion.messages).toEqual([{ role: "user", content: "Hi" }]);
      onText("yo");
      return { inputTokens: 1, outputTokens: 1 };
    });
    const provider: Provider = {
      name: "fake",
      models: [{ id: "fake-small", inputPerMillion: 1, outputPerMillion: 1 }],
      stream,
    };
    const session = new Session(provider, "fake-small", "sys");
    await session.send("Hi", () => undefined);
    expect(stream).toHaveBeenCalledOnce();
  });
});
