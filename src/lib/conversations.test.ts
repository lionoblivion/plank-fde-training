import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

import {
  getConversations,
  getServerConversations,
  resetConversationsCacheForTests,
  saveConversations,
  subscribe,
  titleFromMessages,
  upsertConversation,
  type Conversation,
} from "./conversations";

function userMsg(text: string): UIMessage {
  return {
    id: "u1",
    role: "user",
    parts: [{ type: "text", text }],
  };
}

describe("conversations store", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });
    resetConversationsCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetConversationsCacheForTests();
  });

  it("getServerConversations всегда пустой константный список", () => {
    const a = getServerConversations();
    const b = getServerConversations();
    expect(a).toEqual([]);
    expect(a).toBe(b);
  });

  it("titleFromMessages берёт первый вопрос", () => {
    expect(titleFromMessages([userMsg("Сколько будет 2+2?")])).toBe(
      "Сколько будет 2+2?",
    );
  });

  it("upsert ставит беседу вперёд и сохраняет title", () => {
    upsertConversation({
      id: "a",
      messages: [userMsg("Первый")],
    });
    upsertConversation({
      id: "b",
      messages: [userMsg("Второй")],
    });
    const list = getConversations();
    expect(list.map((c) => c.id)).toEqual(["b", "a"]);
    expect(list[0]?.title).toBe("Второй");
  });

  it("неизменный raw даёт тот же reference массива", () => {
    const first = upsertConversation({
      id: "x",
      messages: [userMsg("hi")],
    });
    const one = getConversations();
    const two = getConversations();
    expect(one).toBe(two);
    expect(one[0]?.id).toBe(first.id);
  });

  it("subscribe вызывается после save", () => {
    const spy = vi.fn();
    const unsubscribe = subscribe(spy);
    saveConversations([
      {
        id: "1",
        title: "t",
        messages: [],
        updatedAt: 1,
      } satisfies Conversation,
    ]);
    expect(spy).toHaveBeenCalled();
    unsubscribe();
  });
});
